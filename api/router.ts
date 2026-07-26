import { createRouter, publicQuery } from "./middleware";
import { memberRouter } from "./member";
import { aiRouter } from "./ai";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  member: memberRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
