import { createServerFn } from "@tanstack/react-start";
import {
  checkOwnerSecret,
  endOwnerSession,
  isOwner,
  startOwnerSession,
} from "./session.js";

/** Whether the current request carries a valid owner session. */
export const getOwnerStatus = createServerFn({ method: "GET" }).handler(() =>
  isOwner(),
);

export const login = createServerFn({ method: "POST" })
  .validator((data: { secret: string }) => {
    if (typeof data?.secret !== "string") throw new Error("Falta la clave");
    return data;
  })
  .handler(async ({ data }) => {
    if (!checkOwnerSecret(data.secret)) return { ok: false as const };
    await startOwnerSession();
    return { ok: true as const };
  });

export const logout = createServerFn({ method: "POST" }).handler(() =>
  endOwnerSession(),
);

/**
 * Only allow redirecting back into the cuaderno after login, so `?next=` can't
 * be used as an open redirect.
 */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/cuaderno(\/|$|\?)/.test(next)
    ? next
    : "/cuaderno";
}
