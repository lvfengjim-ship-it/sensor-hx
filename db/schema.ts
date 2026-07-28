import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  int,
  timestamp,
  bigint,
} from "drizzle-orm/mysql-core";

// 会员表：收集注册会员的基础信息
export const members = mysqlTable("members", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 32 }).notNull(),
  company: varchar("company", { length: 128 }).notNull(),
  position: varchar("position", { length: 64 }),
  focusArea: varchar("focus_area", { length: 64 }), // 技术方向
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 登录会话表
export const sessions = mysqlTable("sessions", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  memberId: bigint("member_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => members.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// 产品询价 / 资料索取
export const inquiries = mysqlTable("inquiries", {
  id: serial("id").primaryKey(),
  memberId: bigint("member_id", { mode: "number", unsigned: true }).references(
    () => members.id,
  ),
  productName: varchar("product_name", { length: 128 }).notNull(),
  contact: varchar("contact", { length: 128 }).notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 会员发布的方案（进入审核后上架到方案集市）
export const solutions = mysqlTable("solutions", {
  id: serial("id").primaryKey(),
  memberId: bigint("member_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => members.id),
  title: varchar("title", { length: 128 }).notNull(),
  mcu: varchar("mcu", { length: 64 }).notNull(), // 适用 MCU
  description: text("description").notNull(),
  price: int("price").notNull(), // 单位：元
  status: mysqlEnum("status", ["pending", "approved", "rejected"])
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// 方案交易订单
export const orders = mysqlTable("orders", {
  id: serial("id").primaryKey(),
  memberId: bigint("member_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => members.id),
  solutionKey: varchar("solution_key", { length: 64 }).notNull(),
  solutionTitle: varchar("solution_title", { length: 128 }).notNull(),
  price: int("price").notNull(), // 单位：元
  status: mysqlEnum("status", ["pending", "paid", "completed"])
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// AI 编程助手使用日志（后台系统使用情况统计）
export const aiUsage = mysqlTable("ai_usage", {
  id: serial("id").primaryKey(),
  memberId: bigint("member_id", { mode: "number", unsigned: true }).references(
    () => members.id,
  ),
  mcu: varchar("mcu", { length: 64 }).notNull(),
  provider: varchar("provider", { length: 64 }).notNull().default(""), // 实际引擎
  durationMs: int("duration_ms").notNull().default(0),
  ok: int("ok").notNull().default(1), // 1 成功 / 0 失败
  error: varchar("error", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
