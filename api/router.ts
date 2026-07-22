import { createRouter, publicQuery } from "./middleware";
import { memberRouter } from "./member";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  member: memberRouter,
});

export type AppRouter = typeof appRouter;
