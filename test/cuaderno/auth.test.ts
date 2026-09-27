import { afterEach, describe, expect, it, vi } from "vitest";
import { safeNext } from "../../src/app/cuaderno/auth.js";
import { checkOwnerSecret } from "../../src/app/cuaderno/session.js";

// Cookie sealing, tampering, expiry and the 401 path need a real request
// context; they're covered end-to-end in test/e2e/cuaderno.spec.ts.

afterEach(() => vi.unstubAllEnvs());

describe("checkOwnerSecret", () => {
  it("accepts only the configured secret", () => {
    vi.stubEnv("CUADERNO_OWNER_SECRET", "correcto");
    expect(checkOwnerSecret("correcto")).toBe(true);
    expect(checkOwnerSecret("incorrecto")).toBe(false);
    expect(checkOwnerSecret("")).toBe(false);
    expect(checkOwnerSecret("correcto ")).toBe(false);
  });

  it("fails loudly when the secret is not configured", () => {
    vi.stubEnv("CUADERNO_OWNER_SECRET", "");
    expect(() => checkOwnerSecret("x")).toThrow("CUADERNO_OWNER_SECRET");
  });
});

describe("safeNext", () => {
  it.each([
    ["/cuaderno", "/cuaderno"],
    ["/cuaderno/nueva?repetir=3", "/cuaderno/nueva?repetir=3"],
    ["/cuaderno?q=x", "/cuaderno?q=x"],
    ["https://evil.example", "/cuaderno"],
    ["//evil.example/cuaderno", "/cuaderno"],
    ["/cuadernos-falsos", "/cuaderno"],
    ["/guias/wilds/chatacabra", "/cuaderno"],
    [undefined, "/cuaderno"],
  ])("%j → %j", (next, expected) => {
    expect(safeNext(next)).toBe(expected);
  });
});
