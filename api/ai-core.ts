/**
 * AI 嵌入式编程助手——核心生成管线（与 tRPC 解耦，可独立测试）
 *
 * 架构：需求 → 知识库检索(规格+代码模板) → Pass1 完整生成
 *       → 确定性静态校验 → 失败则自动修复(≤2轮) → 复检 → 输出
 * 目标：输出完整可用代码，杜绝"框架建议"。
 */
import { TRPCError } from "@trpc/server";
import {
  findKnowledge,
  buildCodePrompt,
  extractIdentifiers,
  COMMON_DESIGN_RULES,
} from "./mcu-knowledge";
import { checkCCode } from "./code-check";

/* ================= 提示词 ================= */

const SYSTEM_PROMPT = `你是一名资深嵌入式固件工程师，为 MCU 设计工程师交付可直接编译烧录的完整设计，并对设计执行三级仿真验证。
请严格按以下七个小节输出，标题一字不差：

## 固件代码
最高优先级：一个完整、可直接编译的单文件 C 代码（用 \`\`\`c 代码块包裹）。铁律：
1. 禁止任何形式的占位与省略：TODO、FIXME、省略号、"（略）"、"以此类推"、"请自行实现"、"类似配置省略"——出现即视为交付失败
2. 所有被调用的函数必须在本文件中给出完整实现（每个驱动、收发、算法、ISR 函数）
3. 所有用到的寄存器/宏/常量必须先定义后使用；芯片相关寄存器集中在文件头部定义区
4. 严格遵循知识库提供的工具链、时钟配置与外设初始化模板；模板中的流程注释必须落实为真实寄存器操作
5. 包含 main() 主循环，完整实现需求的全部功能点；ISR 与主循环共享变量加 volatile；主循环用非阻塞节拍
6. 中文注释；关键数值（波特率除数、定时器重载值、分频系数、PWM 周期）在注释中给出计算过程

## 代码逻辑仿真
（软件仿真：对固件主循环/状态机做逐步推演，检查初始化顺序、边界条件、异常分支与资源泄漏；列出仿真场景与通过情况，如发现问题须先修正上面的固件代码再给出结论）

## 功能与时序仿真
（硬件仿真：核算关键外设时序——UART 波特率误差、I2C/SPI 时钟与建立保持时间、ADC 采样转换时间、PWM 频率精度、中断响应延迟；给出数值计算过程与结论）

## 信号完整性仿真
（物理仿真：分析通信接口信号质量——RS485/CAN 端接匹配、上升沿与振铃、ESD/TVS 防护、电源纹波与去耦、晶振走线；给出风险点与对策结论）

## 引脚分配
（Markdown 表格：引脚 | 功能 | 备注，须与固件代码逐一对得上）

## 物料清单
（Markdown 表格：器件 | 型号/规格 | 封装 | 数量，须与仿真验证后的最终设计一致，包含端接、去耦、防护器件）

## 电气原理图
（若用户提供了已有原理图：校验其连接关系并指出问题与修正建议；若未提供：以网表形式给出建议原理图，逐条列出每个器件的引脚级连接关系，含上拉/下拉/去耦/端接电阻取值）

要求：工程化、可直接编译；针对用户指定的 MCU 与外设选型；三个仿真小节必须给出具体数值与明确结论（通过/修正后通过）；不要输出与上述七个小节无关的内容。`;

/* ================= AI 调用 ================= */

type ChatMessage = { role: "system" | "user"; content: string };

/** 可重试的瞬时错误（过载/限流/网关抖动） */
const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504]);

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
): Promise<Response> {
  const delays = [5000, 15000, 45000];
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(300_000),
      });
      if (res.ok || !RETRYABLE.has(res.status)) return res;
      lastErr = new Error(`${label} 瞬时错误：${res.status}`);
    } catch (e) {
      lastErr = e as Error;
    }
    if (attempt < delays.length) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `${label} 服务繁忙，已重试 ${delays.length} 次仍失败，请稍后再试（${lastErr?.message ?? ""}）`,
  });
}

/** 记录最近一次生成实际使用的引擎（分级引擎链可能自动降级，前端据此如实展示） */
let lastProviderUsed = "";
export function getLastProviderUsed(): string {
  return lastProviderUsed;
}

export async function chatCompletion(
  messages: ChatMessage[],
  maxTokens = 8192,
): Promise<string> {
  const provider = (process.env.AI_PROVIDER || "deepseek").toLowerCase();

  /** DeepSeek 调用（独立函数：AI_PROVIDER=deepseek 时是主引擎，=kimi 时是兜底引擎） */
  const deepseekCall = async (): Promise<string> => {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "服务端未配置 DEEPSEEK_API_KEY",
      });
    }
    const res = await fetchWithRetry(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
          messages,
          stream: false,
          max_tokens: Math.min(maxTokens, 8192),
        }),
      },
      "DeepSeek",
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `DeepSeek 调用失败：${res.status} ${text.slice(0, 200)}`,
      });
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    lastProviderUsed = "deepseek";
    return data.choices?.[0]?.message?.content ?? "";
  };

  if (provider === "ollama") {
    const base = process.env.OLLAMA_BASE_URL;
    const model = process.env.OLLAMA_MODEL;
    if (!base || !model) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "未配置 OLLAMA_BASE_URL / OLLAMA_MODEL",
      });
    }
    const res = await fetch(`${base.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY ?? "ollama"}`,
      },
      body: JSON.stringify({ model, messages, stream: false }),
    });
    if (!res.ok) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Ollama 调用失败：${res.status}`,
      });
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    lastProviderUsed = "ollama";
    return data.choices?.[0]?.message?.content ?? "";
  }

  if (provider === "kimi") {
    // Kimi Code 会员 API（OpenAI 兼容，思考模型：用 low 推理档位控制预算）
    const key = process.env.KIMI_API_KEY;
    if (!key) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "服务端未配置 KIMI_API_KEY",
      });
    }
    const base = (process.env.KIMI_BASE_URL || "https://api.kimi.com/coding/v1").replace(/\/$/, "");

    // 分级引擎链：首选 K3（最新一代），失败后自动降级 K2.7 高速版，再失败兜底 DeepSeek
    const MODEL_CHAIN = [
      ...new Set([process.env.KIMI_MODEL || "k3", "kimi-for-coding-highspeed"]),
    ];
    const IDLE_MS = 90_000; // 流空闲超时：90 秒无数据判定停滞
    const MAX_CONT = 3; // 最多断点续写次数
    // Kimi 链整体预算（两个模型共享），超时即转兜底引擎，避免无限拖延
    const KIMI_BUDGET_MS = Number(process.env.KIMI_BUDGET_MS) || 7 * 60 * 1000;
    const callDeadline = Date.now() + KIMI_BUDGET_MS;

    /**
     * 读取一次 SSE 流。停滞/截断时返回已累积的部分内容（finished=false），
     * 由调用方决定是否断点续写；完全无内容才抛可重试故障。
     */
    const streamOnce = async (
      model: string,
      msgs: unknown[],
    ): Promise<{ text: string; finished: boolean }> => {
      const remaining = callDeadline - Date.now();
      if (remaining < 15_000) {
        throw Object.assign(new Error("生成总耗时超过上限"), { retryable: false });
      }
      const ctrl = new AbortController();
      const overall = setTimeout(
        () => ctrl.abort(),
        Math.min(300_000, remaining - 5_000), // 单请求整体超时，且不超过总预算
      );
      let idle: ReturnType<typeof setTimeout> | undefined;
      const resetIdle = () => {
        if (idle) clearTimeout(idle);
        idle = setTimeout(() => ctrl.abort(), IDLE_MS);
      };
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: msgs,
          // 流式：长输出时保持字节流动，避免网关非流式等待超时（504）
          stream: true,
          max_tokens: maxTokens,
          reasoning_effort: process.env.KIMI_REASONING_EFFORT || "low",
        }),
      }).finally(() => clearTimeout(overall));
      if (!res.ok) {
        if (idle) clearTimeout(idle);
        const text = await res.text().catch(() => "");
        const err = new Error(`Kimi HTTP ${res.status} ${text.slice(0, 120)}`);
        (err as Error & { retryable?: boolean }).retryable = RETRYABLE.has(res.status);
        throw err;
      }
      const reader = res.body?.getReader();
      if (!reader) {
        if (idle) clearTimeout(idle);
        throw Object.assign(new Error("Kimi 响应无数据流"), { retryable: true });
      }
      const decoder = new TextDecoder();
      let text = "";
      let buf = "";
      let streamErr = "";
      let finishReason = "";
      resetIdle();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          resetIdle();
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const l = line.trim();
            if (!l.startsWith("data:")) continue;
            const payload = l.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload) as {
                choices?: { delta?: { content?: string }; finish_reason?: string }[];
                error?: { message?: string };
              };
              if (j.error?.message) streamErr = j.error.message;
              text += j.choices?.[0]?.delta?.content ?? "";
              const fr = j.choices?.[0]?.finish_reason;
              if (fr) finishReason = fr;
            } catch {
              /* 忽略不完整分片 */
            }
          }
        }
      } catch (e) {
        // 停滞/超时中断：已有部分内容则交续写，否则视为可重试故障
        if (text) return { text, finished: false };
        throw Object.assign(
          new Error(`Kimi 流停滞或超时：${(e as Error).message}`),
          { retryable: true },
        );
      } finally {
        if (idle) clearTimeout(idle);
        reader.cancel().catch(() => {});
      }
      if (streamErr && !text) {
        throw Object.assign(new Error(`Kimi 流错误：${streamErr}`), { retryable: true });
      }
      // length = 输出被 max_tokens 截断，需要续写；流错误但有内容也尝试续写
      const finished = !streamErr && finishReason !== "length";
      return { text, finished };
    };

    /** 单次完整尝试：首请求 + 停滞/截断时断点续写；空内容视为可重试故障 */
    const attempt = async (model: string): Promise<string> => {
      let msgs = messages as unknown[];
      let full = "";
      for (let c = 0; c <= MAX_CONT; c++) {
        const { text, finished } = await streamOnce(model, msgs);
        full += text;
        if (finished || !text) break;
        msgs = [
          ...(messages as unknown[]),
          { role: "assistant", content: full },
          {
            role: "user",
            content:
              "请紧接上文的最后一个字符继续输出剩余内容，不要重复已输出部分，不要添加任何解释或道歉。",
          },
        ];
      }
      if (!full) {
        throw Object.assign(new Error(`Kimi（${model}）返回空内容`), { retryable: true });
      }
      return full;
    };

    // 沿引擎链逐级尝试：每个模型最多 2 次尝试，共享时间预算
    let lastErr: Error | null = null;
    for (const model of MODEL_CHAIN) {
      for (let i = 0; i < 2; i++) {
        if (callDeadline - Date.now() < 15_000) {
          lastErr = new Error("Kimi 引擎链耗时超过预算");
          break;
        }
        try {
          const result = await attempt(model);
          lastProviderUsed = model;
          return result;
        } catch (e) {
          lastErr = e as Error;
          const retryable = (e as Error & { retryable?: boolean }).retryable !== false;
          if (!retryable) break; // 该模型不可用（如权限/参数），直接换下一级
          // 短暂退避，且不越过总预算
          await new Promise((r) =>
            setTimeout(r, Math.min(6000, Math.max(0, callDeadline - Date.now() - 10_000))),
          );
        }
      }
    }
    // Kimi 链整体失败：配置了 DeepSeek 密钥则自动兜底，保证用户一定能拿到结果
    if (process.env.DEEPSEEK_API_KEY) {
      return deepseekCall();
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Kimi 服务繁忙或调用超时，请稍后重试（${lastErr?.message ?? "未知错误"}）`,
    });
  }

  // 默认 DeepSeek（AI_PROVIDER 非 kimi/ollama）
  return deepseekCall();
}

/* ================= 解析 ================= */

function grabSection(md: string, title: string): string {
  // 匹配任意级别标题（#/##/###）及“一、”编号前缀；
  // 结束于同级或更高级标题，允许小节内包含子标题
  const startRe = new RegExp(
    `^(#{1,6})\\s*(?:[一二三四五六七\\d]+[、.．]\\s*)?${title}[^\\n]*$`,
    "m",
  );
  const m = startRe.exec(md);
  if (!m) return "";
  const level = m[1].length;
  const rest = md.slice(m.index + m[0].length);
  const endRe = new RegExp(`\\n#{1,${level}}(?!#)[^\\S\\n]`);
  const e = endRe.exec(rest);
  return (e ? rest.slice(0, e.index) : rest).trim();
}

function extractCode(md: string): string {
  const section = grabSection(md, "固件代码") || md;
  const codeMatch = section.match(/```(?:c|cpp|C)?\s*\n([\s\S]*?)```/);
  return (codeMatch?.[1] ?? section).trim();
}

export type GenInput = {
  requirement: string;
  mcu: string;
  peripherals: string[];
  schematic?: string;
};

export type CodeCheckReport = {
  initialIssues: string[];
  repairRounds: number;
  finalErrors: string[];
  finalWarnings: string[];
};

export type GenOutput = {
  code: string;
  simLogic: string;
  simTiming: string;
  simSI: string;
  pins: string;
  schematic: string;
  bom: string;
  raw: string;
  codeCheck: CodeCheckReport;
  /** 实际完成本次生成的引擎（k3 / kimi-for-coding-highspeed / deepseek / ollama） */
  providerUsed: string;
};

/* ================= 生成管线 ================= */

const MAX_REPAIR_ROUNDS = 2;

/** 按供应商给出输出预算：Kimi 思考模型的推理消耗同一预算，需预留余量；DeepSeek 上限 8192 */
function outTokens(): number {
  return (process.env.AI_PROVIDER || "").toLowerCase() === "kimi" ? 24576 : 8192;
}

export async function runGeneration(input: GenInput): Promise<GenOutput> {
  // 全流程软上限：各环节检查剩余时间，避免整体耗时无限拉长（前端 20 分钟兜底）
  const FLOW_START = Date.now();
  const flowTimedOut = () => Date.now() - FLOW_START > 15 * 60 * 1000;
  const kb = findKnowledge(input.mcu);
  const codePrompt = buildCodePrompt(kb, input.peripherals);

  const kbPrompt = kb
    ? [
        `目标 MCU 知识库（来自官方样本/数据手册，必须严格遵循）：`,
        `【${kb.title}】`,
        `规格参数：${kb.specs}`,
        `原理图与 PCB 设计要点：${kb.designNotes}`,
      ].join("\n")
    : `目标 MCU ${input.mcu} 暂无本地知识库条目，请基于该型号公开数据手册的通用规格进行设计，并在不确定的参数上注明假设。`;

  const userPrompt = [
    `项目需求：${input.requirement}`,
    `目标 MCU：${input.mcu}`,
    kbPrompt,
    codePrompt,
    COMMON_DESIGN_RULES,
    input.peripherals.length
      ? `需要的外设：${input.peripherals.join("、")}`
      : "",
    input.schematic
      ? `用户提供的已有电气原理图（连接关系/网表描述），请以此为基础设计并校验：\n${input.schematic}`
      : "用户未提供电气原理图，请给出建议原理图。",
    "请生成完整设计并执行三级仿真验证。再次强调：固件代码必须是完整实现，所有函数有函数体，禁止任何占位符。",
  ]
    .filter(Boolean)
    .join("\n\n");

  /* ---- Pass 1：完整生成 ---- */
  const md = await chatCompletion(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    outTokens(),
  );
  if (!md) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI 未返回内容，请重试",
    });
  }
  const providerUsed = getLastProviderUsed() || "unknown";

  let code = extractCode(md);

  /* ---- 校验 → 修复循环 ---- */
  const whitelist = new Set<string>([
    ...extractIdentifiers(codePrompt),
    ...extractIdentifiers(COMMON_DESIGN_RULES),
  ]);
  let check = checkCCode(code, {
    peripherals: input.peripherals,
    whitelist,
  });
  const initialIssues = [
    ...check.errorSummary,
    ...check.issues
      .filter((i) => i.severity === "warn")
      .map((i) => `[${i.rule}] ${i.detail}`),
  ];
  let repairRounds = 0;

  while (!check.passed && repairRounds < MAX_REPAIR_ROUNDS) {
    if (flowTimedOut()) break; // 时间预算耗尽：保留当前代码直接交付，附校验报告
    repairRounds += 1;
    const repairPrompt = [
      `你刚才交付的固件代码未通过服务端完整性静态校验，存在以下必须修复的问题：`,
      ...check.errorSummary.map((s) => `- ${s}`),
      "",
      "原代码：",
      "```c",
      code,
      "```",
      "",
      "请输出修复后的完整固件代码：保留原有功能与设计，修复上述全部问题；所有被调用函数必须给出完整函数体；禁止任何占位符与省略。只输出一个 ```c 代码块，不要输出其他内容。",
    ].join("\n");

    const fixed = await chatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: repairPrompt },
      ],
      // 修复只输出代码，不需要七小节的长预算，缩减以缩短耗时
      Math.min(outTokens(), 8192),
    );
    const fixedCode = extractCode(fixed);
    if (fixedCode.length > 500) code = fixedCode;
    check = checkCCode(code, { peripherals: input.peripherals, whitelist });
  }

  const finalWarnings = check.issues
    .filter((i) => i.severity === "warn")
    .map((i) => `[${i.rule}] ${i.detail}`);

  /* ---- 缺节补全：长输出可能被 max_tokens 截断，缺失小节单独续写 ---- */
  const SECTION_KEYS = {
    simLogic: "代码逻辑仿真",
    simTiming: "功能与时序仿真",
    simSI: "信号完整性仿真",
    pins: "引脚分配",
    bom: "物料清单",
    schematic: "电气原理图",
  } as const;
  const sections: Record<string, string> = {};
  for (const [k, t] of Object.entries(SECTION_KEYS)) {
    sections[k] = grabSection(md, t);
  }
  const missing = Object.entries(SECTION_KEYS).filter(([k]) => !sections[k]);
  let raw = md;
  if (missing.length > 0 && !flowTimedOut()) {
    const contPrompt = [
      "上次输出因长度限制被截断，缺少以下小节。请只输出这些缺失小节，",
      "每个标题用 ## 级别且一字不差，内容要求与系统提示一致：",
      ...missing.map(([, t]) => `## ${t}`),
      "",
      `设计背景：目标 MCU ${input.mcu}；外设：${input.peripherals.join("、") || "无"}；`,
      `需求摘要：${input.requirement.slice(0, 600)}`,
    ].join("\n");
    const cont = await chatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: contPrompt },
      ],
      Math.min(outTokens(), 8192),
    );
    for (const [k, t] of missing) {
      const s = grabSection(cont, t);
      if (s) {
        sections[k] = s;
        raw += `\n\n## ${t}\n${s}`;
      }
    }
  }

  return {
    code,
    simLogic: sections.simLogic,
    simTiming: sections.simTiming,
    simSI: sections.simSI,
    pins: sections.pins,
    schematic: sections.schematic,
    bom: sections.bom,
    raw,
    codeCheck: {
      initialIssues,
      repairRounds,
      finalErrors: check.errorSummary,
      finalWarnings,
    },
    providerUsed,
  };
}
