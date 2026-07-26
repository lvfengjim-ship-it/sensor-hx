import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { requireMember } from "./member";

const SYSTEM_PROMPT = `你是一名资深嵌入式硬件工程师，帮助 MCU 设计工程师完成从需求到可打板试样的完整设计。
请严格按以下四个小节输出，标题一字不差：

## 固件代码
（一个完整可编译的 C 代码文件，用 \`\`\`c 代码块包裹，包含外设初始化、驱动调用与主循环，中文注释）

## 引脚分配
（Markdown 表格：引脚 | 功能 | 备注）

## PCB布局建议
（分条列出布局布线要点：电源与去耦、晶振、通信接口保护、传感器摆放、地平面与 EMI）

## 物料清单
（Markdown 表格：器件 | 型号/规格 | 封装 | 数量）

要求：工程化、可直接编译；针对用户指定的 MCU 与外设选型；不要输出与上述四个小节无关的内容。`;

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
      max_tokens: 4096,
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
    pins: grabSection(md, "引脚分配"),
    pcb: grabSection(md, "PCB布局建议"),
    bom: grabSection(md, "物料清单"),
    raw: md,
  };
}

export const aiRouter = createRouter({
  generate: publicQuery
    .input(
      z.object({
        requirement: z.string().min(5, "请描述项目需求").max(3000),
        mcu: z.string().min(1).max(64),
        peripherals: z.array(z.string().max(64)).max(16).default([]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await requireMember(ctx); // 仅会员可用
      const userPrompt = [
        `项目需求：${input.requirement}`,
        `目标 MCU：${input.mcu}`,
        input.peripherals.length
          ? `需要的外设：${input.peripherals.join("、")}`
          : "",
        "请生成完整设计。",
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
