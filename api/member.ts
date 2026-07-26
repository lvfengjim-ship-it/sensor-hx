import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { createRouter, publicQuery } from "./middleware";
import type { TrpcContext } from "./context";
import { getDb } from "./queries/connection";
import { members, sessions, inquiries, solutions, orders } from "../db/schema";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 天

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const hash = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

async function createSession(memberId: number) {
  const token = randomBytes(32).toString("hex");
  await getDb().insert(sessions).values({
    token,
    memberId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

export async function requireMember(ctx: TrpcContext) {
  const auth = ctx.req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
  }
  const db = getDb();
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);
  if (!session || session.expiresAt < new Date()) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "登录已过期，请重新登录",
    });
  }
  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, session.memberId))
    .limit(1);
  if (!member) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "会员不存在" });
  }
  return member;
}

function publicMember(m: typeof members.$inferSelect) {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone,
    company: m.company,
    position: m.position,
    focusArea: m.focusArea,
    createdAt: m.createdAt,
  };
}

export const memberRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(1, "请填写姓名").max(64),
        email: z.string().email("邮箱格式不正确"),
        phone: z.string().min(5, "请填写有效手机号").max(32),
        company: z.string().min(1, "请填写公司名称").max(128),
        position: z.string().max(64).optional(),
        focusArea: z.string().max(64).optional(),
        password: z.string().min(6, "密码至少 6 位").max(72),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(members)
        .where(eq(members.email, input.email))
        .limit(1);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "该邮箱已注册，请直接登录",
        });
      }
      const result = await db.insert(members).values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        position: input.position ?? null,
        focusArea: input.focusArea ?? null,
        passwordHash: hashPassword(input.password),
      });
      const memberId = Number(result[0].insertId);
      const token = await createSession(memberId);
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.id, memberId))
        .limit(1);
      return { token, member: publicMember(member) };
    }),

  login: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [member] = await db
        .select()
        .from(members)
        .where(eq(members.email, input.email))
        .limit(1);
      if (!member || !verifyPassword(input.password, member.passwordHash)) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "邮箱或密码不正确",
        });
      }
      const token = await createSession(member.id);
      return { token, member: publicMember(member) };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const member = await requireMember(ctx);
    return publicMember(member);
  }),

  logout: publicQuery.mutation(async ({ ctx }) => {
    const auth = ctx.req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token) {
      await getDb().delete(sessions).where(eq(sessions.token, token));
    }
    return { ok: true };
  }),

  inquire: publicQuery
    .input(
      z.object({
        productName: z.string().min(1).max(128),
        contact: z.string().min(1, "请留下联系方式").max(128),
        message: z.string().max(2000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      let memberId: number | null = null;
      try {
        const member = await requireMember(ctx);
        memberId = member.id;
      } catch {
        // 未登录访客也可提交询价
      }
      await getDb().insert(inquiries).values({
        memberId,
        productName: input.productName,
        contact: input.contact,
        message: input.message ?? null,
      });
      return { ok: true };
    }),

  publishSolution: publicQuery
    .input(
      z.object({
        title: z.string().min(2).max(128),
        mcu: z.string().min(1).max(64),
        description: z.string().min(10, "请简要描述方案").max(4000),
        price: z.number().int().min(0).max(1000000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const member = await requireMember(ctx);
      await getDb().insert(solutions).values({
        memberId: member.id,
        title: input.title,
        mcu: input.mcu,
        description: input.description,
        price: input.price,
      });
      return { ok: true, message: "方案已提交，审核通过后上架" };
    }),

  createOrder: publicQuery
    .input(
      z.object({
        solutionKey: z.string().min(1).max(64),
        solutionTitle: z.string().min(1).max(128),
        price: z.number().int().min(0),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const member = await requireMember(ctx);
      await getDb().insert(orders).values({
        memberId: member.id,
        solutionKey: input.solutionKey,
        solutionTitle: input.solutionTitle,
        price: input.price,
      });
      return { ok: true, message: "订单已创建，我们将在 24 小时内与你联系交付" };
    }),

  myOrders: publicQuery.query(async ({ ctx }) => {
    const member = await requireMember(ctx);
    return getDb()
      .select()
      .from(orders)
      .where(eq(orders.memberId, member.id))
      .orderBy(desc(orders.createdAt))
      .limit(50);
  }),

  mySolutions: publicQuery.query(async ({ ctx }) => {
    const member = await requireMember(ctx);
    return getDb()
      .select()
      .from(solutions)
      .where(eq(solutions.memberId, member.id))
      .orderBy(desc(solutions.createdAt))
      .limit(50);
  }),
});
