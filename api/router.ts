import { createRouter, publicQuery } from "./middleware";
import { memberRouter } from "./member";
import { aiRouter } from "./ai";
import { adminRouter } from "./admin";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  member: memberRouter,
  ai: aiRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
