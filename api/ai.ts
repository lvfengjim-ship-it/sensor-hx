import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { requireMember } from "./member";
import { findKnowledge, COMMON_DESIGN_RULES } from "./mcu-knowledge";

const SYSTEM_PROMPT = `你是一名资深嵌入式硬件工程师，帮助 MCU 设计工程师完成从需求到可打板试样的完整设计，并对设计执行三级仿真验证。
请严格按以下七个小节输出，标题一字不差：

## 固件代码
（一个完整可编译的 C 代码文件，用 \`\`\`c 代码块包裹，包含外设初始化、驱动调用与主循环，中文注释）

## 代码逻辑仿真
（软件仿真：对固件主循环/状态机做逐步推演，检查初始化顺序、边界条件、异常分支与资源泄漏；列出仿真场景与通过情况，如发现问题须先修正上面的固件代码再给出结论）

## 功能与时序仿真
（硬件仿真：核算关键外设时序——UART 波特率误差、I2C/SPI 时钟与建立保持时间、ADC 采样转换时间、PWM 频率精度、中断响应延迟；给出数值计算过程与结论）

## 信号完整性仿真
（物理仿真：分析通信接口信号质量——RS485/CAN 端接匹配、上升沿与振铃、ESD/TVS 防护、电源纹波与去耦、晶振走线；给出风险点与对策结论）

## 引脚分配
（Markdown 表格：引脚 | 功能 | 备注，须与固件代码和仿真结果一致）

## 电气原理图
（若用户提供了已有原理图：校验其连接关系并指出问题与修正建议；若未提供：以网表形式给出建议原理图，逐条列出每个器件的引脚级连接关系，含上拉/下拉/去耦/端接电阻取值）

## 物料清单
（Markdown 表格：器件 | 型号/规格 | 封装 | 数量，须与仿真验证后的最终设计一致，包含端接、去耦、防护器件）

要求：工程化、可直接编译；针对用户指定的 MCU 与外设选型；三个仿真小节必须给出具体数值与明确结论（通过/修正后通过）；不要输出与上述七个小节无关的内容。`;

type ChatMessage = { role: "system" | "user"; content: string };

async function chatCompletion(messages: ChatMessage[]): Promise<string> {
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

  // 默认 DeepSeek
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
      max_tokens: 8192,
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

function grabSection(md: string, title: string): string {
  const m = md.match(
    new RegExp(`##\\s*${title}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`),
  );
  return m?.[1]?.trim() ?? "";
}

function parseResult(md: string) {
  const codeSection = grabSection(md, "固件代码");
  const codeMatch = codeSection.match(/```(?:c|cpp|C)?\s*\n([\s\S]*?)```/);
  return {
    code: (codeMatch?.[1] ?? codeSection).trim(),
    simLogic: grabSection(md, "代码逻辑仿真"),
    simTiming: grabSection(md, "功能与时序仿真"),
    simSI: grabSection(md, "信号完整性仿真"),
    pins: grabSection(md, "引脚分配"),
    schematic: grabSection(md, "电气原理图"),
    bom: grabSection(md, "物料清单"),
    raw: md,
  };
}

export const aiRouter = createRouter({
  /** 从 PDF 原理图文件中提取文本（连接关系/网表），供“已有电气原理图”输入使用 */
  extractSchematic: publicQuery
    .input(
      z.object({
        /** PDF 文件的 base64 编码（≤6MB 原文件） */
        fileBase64: z.string().min(16).max(9_000_000),
        filename: z.string().max(128).default("schematic.pdf"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireMember(ctx); // 仅会员可用
      let buffer: Buffer;
      try {
        buffer = Buffer.from(input.fileBase64, "base64");
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "文件编码无效，请重新选择 PDF 文件",
        });
      }
      if (buffer.length > 6 * 1024 * 1024) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "PDF 文件不能超过 6MB",
        });
      }
      if (!buffer.subarray(0, 5).toString("latin1").startsWith("%PDF")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "所选文件不是有效的 PDF",
        });
      }
      try {
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const result = await parser.getText();
        await parser.destroy();
        const text = (result.text ?? "").replace(/\s+\n/g, "\n").trim();
        if (text.length < 30) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "该 PDF 几乎提取不到文字，可能是扫描件或图片型原理图。请改用文本描述连接关系，或导出为文本型 PDF。",
          });
        }
        // 控制长度，避免超出生成接口的 schematic 上限
        return { text: text.slice(0, 6000), truncated: text.length > 6000 };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "PDF 解析失败，请确认文件未加密且未损坏",
        });
      }
    }),

  generate: publicQuery
    .input(
      z.object({
        requirement: z.string().min(5, "请描述项目需求").max(3000),
        mcu: z.string().min(1).max(64),
        peripherals: z.array(z.string().max(64)).max(24).default([]),
        schematic: z.string().max(6000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireMember(ctx); // 仅会员可用

      // 检索目标 MCU 的样本知识库，注入精确规格与设计要点
      const kb = findKnowledge(input.mcu);
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
        COMMON_DESIGN_RULES,
        input.peripherals.length
          ? `需要的外设：${input.peripherals.join("、")}`
          : "",
        input.schematic
          ? `用户提供的已有电气原理图（连接关系/网表描述），请以此为基础设计并校验：\n${input.schematic}`
          : "用户未提供电气原理图，请给出建议原理图。",
        "请生成完整设计并执行三级仿真验证。",
      ]
        .filter(Boolean)
        .join("\n");

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
      return parseResult(md);
    }),
});
