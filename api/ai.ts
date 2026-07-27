import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { requireMember } from "./member";
import { runGeneration } from "./ai-core";

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

  /**
   * 完整设计生成：知识库注入 → 完整性契约提示词 → 静态校验 → 自动修复(≤2轮) → 输出
   * 保证交付完整可用代码而非框架建议
   */
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
      return runGeneration(input);
    }),
});
