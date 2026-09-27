import { createHash, timingSafeEqual } from "node:crypto";
import {
  getCookie,
  setResponseStatus,
  unsealSession,
  useSession,
} from "@tanstack/react-start/server";

/**
 * Owner session for the cuaderno (009). Server-only: import from server
 * function handlers, never from component code.
 *
 * Uses Start's built-in sealed session (encrypted + signed cookie) rather than
 * a hand-rolled HMAC cookie. Reads stay public; only forms and mutations need
 * the owner, and every mutating server function calls `requireOwner()` itself.
 */

type OwnerSession = { owner?: true };

const COOKIE_NAME = "cuaderno";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function sessionConfig() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return {
    password,
    name: COOKIE_NAME,
    maxAge: THIRTY_DAYS,
    // Only accept the session from the cookie, never from a request header.
    sessionHeader: false as const,
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      // Secure in every production build, off only under `vite dev` (plain
      // HTTP). Browsers accept Secure cookies on http://localhost, so the E2E
      // suite still works against the production build.
      secure: !import.meta.env.DEV,
      path: "/",
    },
  };
}

/** Constant-time comparison of a submitted secret against CUADERNO_OWNER_SECRET. */
export function checkOwnerSecret(submitted: string): boolean {
  const expected = process.env.CUADERNO_OWNER_SECRET;
  if (!expected) {
    throw new Error("CUADERNO_OWNER_SECRET is not set");
  }
  // Hash both sides so lengths match and timingSafeEqual never throws.
  const a = createHash("sha256").update(submitted).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Read-only owner check. Deliberately avoids `getSession`, which creates (and
 * sets a cookie for) an empty session on every anonymous request — public
 * cuaderno pages must not set cookies. No cookie, a tampered seal, or an
 * expired one all mean "not owner".
 */
export async function isOwner(): Promise<boolean> {
  const sealed = getCookie(COOKIE_NAME);
  if (!sealed) return false;
  try {
    const session = await unsealSession(sessionConfig(), sealed);
    return (session.data as OwnerSession | undefined)?.owner === true;
  } catch {
    return false;
  }
}

/** Guard for mutating server functions: responds 401 and throws unless owner. */
export async function requireOwner(): Promise<void> {
  if (!(await isOwner())) {
    setResponseStatus(401);
    throw new Error("No autorizado");
  }
}

export async function startOwnerSession(): Promise<void> {
  const session = await useSession<OwnerSession>(sessionConfig());
  await session.update({ owner: true });
}

export async function endOwnerSession(): Promise<void> {
  const session = await useSession<OwnerSession>(sessionConfig());
  await session.clear();
}
