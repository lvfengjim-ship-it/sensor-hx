/**
 * 管理后台 API：客户、会话、询价、方案审核、订单与 AI 使用情况
 * 认证方式：请求头 x-admin-key 与服务端 ADMIN_KEY 比对（时序安全）
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, gt, sql, and } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { createRouter, publicQuery } from "./middleware";
import type { TrpcContext } from "./context";
import { getDb } from "./queries/connection";
import {
  members,
  sessions,
  inquiries,
  solutions,
  orders,
  aiUsage,
} from "../db/schema";

/** 启动时确保 ai_usage 表存在（幂等，兼容未跑迁移的生产库） */
let schemaEnsured = false;
export async function ensureAdminSchema() {
  if (schemaEnsured) return;
  schemaEnsured = true;
  try {
    await getDb().execute(sql`
      CREATE TABLE IF NOT EXISTS ai_usage (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        member_id BIGINT UNSIGNED NULL,
        mcu VARCHAR(64) NOT NULL,
        provider VARCHAR(64) NOT NULL DEFAULT '',
        duration_ms INT NOT NULL DEFAULT 0,
        ok INT NOT NULL DEFAULT 1,
        error VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ai_usage_created (created_at),
        INDEX idx_ai_usage_member (member_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e) {
    schemaEnsured = false; // 下次再试
    console.error("[admin] ai_usage 建表失败：", (e as Error).message);
  }
}

export function requireAdmin(ctx: TrpcContext) {
  const configured = process.env.ADMIN_KEY ?? "";
  const provided = ctx.req.headers.get("x-admin-key") ?? "";
  if (!configured) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "服务端未配置 ADMIN_KEY，后台不可用",
    });
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(configured);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "管理密钥无效",
    });
  }
}

const adminProc = publicQuery.use(async ({ ctx, next }) => {
  requireAdmin(ctx);
  await ensureAdminSchema();
  return next();
});

export const adminRouter = createRouter({
  /** 验证密钥（后台登录用） */
  verify: adminProc.query(() => ({ ok: true as const })),

  /** 总览统计卡片 */
  overview: adminProc.query(async () => {
    const db = getDb();
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    const count = async (q: Promise<{ c: number | string }[]>) => {
      const [row] = await q;
      return Number(row?.c ?? 0);
    };

    const memberTotal = await count(
      db.select({ c: sql<number>`count(*)` }).from(members),
    );
    const memberNew30 = await count(
      db.select({ c: sql<number>`count(*)` }).from(members).where(gt(members.createdAt, d30)),
    );
    const activeSessions = await count(
      db.select({ c: sql<number>`count(*)` }).from(sessions).where(gt(sessions.expiresAt, now)),
    );
    const inquiryTotal = await count(
      db.select({ c: sql<number>`count(*)` }).from(inquiries),
    );
    const solutionByStatus = await db
      .select({ status: solutions.status, c: sql<number>`count(*)` })
      .from(solutions)
      .groupBy(solutions.status);
    const orderStats = await db
      .select({
        status: orders.status,
        c: sql<number>`count(*)`,
        amount: sql<number>`coalesce(sum(price),0)`,
      })
      .from(orders)
      .groupBy(orders.status);
    const ai7 = await count(
      db.select({ c: sql<number>`count(*)` }).from(aiUsage).where(gt(aiUsage.createdAt, d7)),
    );
    const ai30 = await count(
      db.select({ c: sql<number>`count(*)` }).from(aiUsage).where(gt(aiUsage.createdAt, d30)),
    );
    const aiByProvider = await db
      .select({ provider: aiUsage.provider, c: sql<number>`count(*)` })
      .from(aiUsage)
      .where(gt(aiUsage.createdAt, d30))
      .groupBy(aiUsage.provider);
    const aiFail30 = await count(
      db
        .select({ c: sql<number>`count(*)` })
        .from(aiUsage)
        .where(and(gt(aiUsage.createdAt, d30), eq(aiUsage.ok, 0))),
    );
    return {
      memberTotal,
      memberNew30,
      activeSessions,
      inquiryTotal,
      solutionByStatus,
      orderStats,
      ai7,
      ai30,
      aiByProvider,
      aiFail30,
    };
  }),

  /** 注册客户列表（含订单数与最近登录） */
  members: adminProc.query(async () => {
    const db = getDb();
    const rows = await db
      .select({
        id: members.id,
        name: members.name,
        email: members.email,
        phone: members.phone,
        company: members.company,
        position: members.position,
        focusArea: members.focusArea,
        createdAt: members.createdAt,
        orderCount: sql<number>`(select count(*) from orders o where o.member_id = members.id)`,
        aiCount: sql<number>`(select count(*) from ai_usage u where u.member_id = members.id)`,
        lastLogin: sql<Date | null>`(select max(s.created_at) from sessions s where s.member_id = members.id)`,
      })
      .from(members)
      .orderBy(desc(members.createdAt))
      .limit(500);
    return rows;
  }),

  /** 当前有效会话（在线/近期登录客户） */
  activeSessions: adminProc.query(async () => {
    const db = getDb();
    return db
      .select({
        sessionId: sessions.id,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        memberId: members.id,
        name: members.name,
        email: members.email,
        company: members.company,
      })
      .from(sessions)
      .innerJoin(members, eq(sessions.memberId, members.id))
      .where(gt(sessions.expiresAt, new Date()))
      .orderBy(desc(sessions.createdAt))
      .limit(200);
  }),

  /** 询价 / 资料索取记录 */
  inquiries: adminProc.query(async () => {
    const db = getDb();
    return db
      .select({
        id: inquiries.id,
        productName: inquiries.productName,
        contact: inquiries.contact,
        message: inquiries.message,
        createdAt: inquiries.createdAt,
        memberName: members.name,
        memberEmail: members.email,
      })
      .from(inquiries)
      .leftJoin(members, eq(inquiries.memberId, members.id))
      .orderBy(desc(inquiries.createdAt))
      .limit(300);
  }),

  /** 方案列表（含审核操作） */
  solutions: adminProc.query(async () => {
    const db = getDb();
    return db
      .select({
        id: solutions.id,
        title: solutions.title,
        mcu: solutions.mcu,
        price: solutions.price,
        status: solutions.status,
        createdAt: solutions.createdAt,
        memberName: members.name,
        memberEmail: members.email,
      })
      .from(solutions)
      .innerJoin(members, eq(solutions.memberId, members.id))
      .orderBy(desc(solutions.createdAt))
      .limit(300);
  }),

  /** 方案审核：通过 / 驳回 */
  reviewSolution: adminProc
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["approved", "rejected"]),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(solutions)
        .set({ status: input.status })
        .where(eq(solutions.id, input.id));
      return { ok: true as const };
    }),

  /** 订单列表 */
  orders: adminProc.query(async () => {
    const db = getDb();
    return db
      .select({
        id: orders.id,
        solutionTitle: orders.solutionTitle,
        price: orders.price,
        status: orders.status,
        createdAt: orders.createdAt,
        memberName: members.name,
        memberEmail: members.email,
      })
      .from(orders)
      .innerJoin(members, eq(orders.memberId, members.id))
      .orderBy(desc(orders.createdAt))
      .limit(300);
  }),

  /** AI 使用明细（最近 200 条） */
  aiUsage: adminProc.query(async () => {
    const db = getDb();
    return db
      .select({
        id: aiUsage.id,
        mcu: aiUsage.mcu,
        provider: aiUsage.provider,
        durationMs: aiUsage.durationMs,
        ok: aiUsage.ok,
        error: aiUsage.error,
        createdAt: aiUsage.createdAt,
        memberName: members.name,
        memberEmail: members.email,
      })
      .from(aiUsage)
      .leftJoin(members, eq(aiUsage.memberId, members.id))
      .orderBy(desc(aiUsage.createdAt))
      .limit(200);
  }),
});
