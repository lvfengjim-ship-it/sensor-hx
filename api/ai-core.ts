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

export async function chatCompletion(
  messages: ChatMessage[],
  maxTokens = 8192,
): Promise<string> {
  const provider = (process.env.AI_PROVIDER || "deepseek").toLowerCase();

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
    return data.choices?.[0]?.message?.content ?? "";
  }

  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "服务端未配置 DEEPSEEK_API_KEY",
    });
  }
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages,
      stream: false,
      max_tokens: maxTokens,
    }),
  });
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
  return data.choices?.[0]?.message?.content ?? "";
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
};

/* ================= 生成管线 ================= */

const MAX_REPAIR_ROUNDS = 2;

export async function runGeneration(input: GenInput): Promise<GenOutput> {
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
  const md = await chatCompletion([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ]);
  if (!md) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "AI 未返回内容，请重试",
    });
  }

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
      8192,
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
  if (missing.length > 0) {
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
      4096,
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
  };
}
