import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { E2E_OWNER_SECRET } from "../../playwright.config.js";

// The cuaderno specs share the hunts table (truncated in global-setup), so run
// them in order within this file.
test.describe.configure({ mode: "serial" });

/** Wait for hydration: client handlers aren't attached before it. */
async function go(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

async function login(page: Page, next = "/cuaderno") {
  await go(page, `/cuaderno/entrar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Clave").fill(E2E_OWNER_SECRET);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => u.pathname + u.search === next);
  await page.waitForLoadState("networkidle");
}

async function logHunt(
  page: Page,
  h: { monster: string; weapon?: string; time?: string; carts?: string; causes?: string[]; next?: string; hits?: string },
) {
  await go(page, "/cuaderno/nueva");
  await page.getByLabel("Monstruo").fill(h.monster);
  if (h.weapon) await page.getByLabel("Arma").selectOption({ label: h.weapon });
  if (h.time) await page.getByLabel("Tiempo (mm:ss)").fill(h.time);
  if (h.carts) await page.getByLabel("Desmayos").selectOption(h.carts);
  if (h.hits) await page.getByLabel(/Ataques que te golpearon/).fill(h.hits);
  for (const c of h.causes ?? []) await page.getByText(c, { exact: true }).click();
  if (h.next) await page.getByLabel("Objetivo para la próxima vez").fill(h.next);
  await page.getByRole("button", { name: "Guardar cacería" }).click();
  await page.waitForURL(/\/cuaderno\?abierta=\d+/);
}

test("visitor sees the empty hub with login links but no owner controls or cookies", async ({ page, request }) => {
  const res = await request.get("/cuaderno");
  expect(res.status()).toBe(200);
  expect(res.headers()["set-cookie"]).toBeUndefined();
  const html = await res.text();
  expect(html).toContain("Cuaderno de Caza");
  expect(html).toContain("Sin cacerías todavía.");
  expect(html).not.toContain('content="noindex"');

  await go(page, "/cuaderno");
  await expect(page.getByRole("button", { name: "Salir" })).toHaveCount(0);

  // "Entrar" logs in and comes back to the page it was clicked on.
  await go(page, "/cuaderno?q=x");
  await page.getByRole("link", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/cuaderno\/entrar\?next=%2Fcuaderno%3Fq%3Dx/);
});

test("visitor's Registrar link goes through login to the form", async ({ page }) => {
  await go(page, "/cuaderno");
  await page.getByRole("link", { name: "+ Registrar cacería" }).click();
  await expect(page).toHaveURL(/\/cuaderno\/entrar\?next=%2Fcuaderno%2Fnueva/);
  await page.getByLabel("Clave").fill(E2E_OWNER_SECRET);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Nueva cacería")).toBeVisible();
});

test("form routes send visitors to the login page and are noindex", async ({ page, request }) => {
  await go(page, "/cuaderno/nueva");
  await expect(page).toHaveURL(/\/cuaderno\/entrar\?next=%2Fcuaderno%2Fnueva/);
  const html = await (await request.get("/cuaderno/entrar")).text();
  expect(html).toContain('content="noindex"');
});

test("wrong secret is rejected without a session", async ({ page, context }) => {
  await go(page, "/cuaderno/entrar");
  await page.getByLabel("Clave").fill("nope");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Clave incorrecta.")).toBeVisible();
  expect((await context.cookies()).map((c) => c.name)).not.toContain("cuaderno");
});

test("owner logs, reviews, edits, repeats and deletes hunts", async ({ page, context }) => {
  await login(page);
  // The production build must always send a Secure, httpOnly, Lax cookie.
  const session = (await context.cookies()).find((c) => c.name === "cuaderno");
  expect(session).toMatchObject({ secure: true, httpOnly: true, sameSite: "Lax" });
  await expect(page.getByRole("button", { name: "Salir" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Entrar" })).toHaveCount(0);

  // Validation error comes back in Spanish and nothing is saved.
  await go(page, "/cuaderno/nueva");
  await page.getByLabel("Monstruo").fill("Rey Dau");
  await page.getByLabel("Tiempo (mm:ss)").evaluate((el: HTMLInputElement) => {
    el.removeAttribute("pattern"); // exercise server-side validation
    el.value = "18:4";
  });
  await page.getByRole("button", { name: "Guardar cacería" }).click();
  await expect(page.getByText("Escribe el tiempo como minutos:segundos")).toBeVisible();

  await logHunt(page, {
    monster: "Rey Dau",
    time: "18:40",
    carts: "1",
    causes: ["Mal posicionado", "No vi la señal"],
    hits: "Picado aéreo ×4",
    next: "Alejarme en diagonal cuando despega",
  });
  // Saved entry is expanded on the hub.
  await expect(page.locator("details[open]")).toContainText("Picado aéreo ×4");
  await expect(page.locator(".cz-summary")).toContainText("18:40");
  await expect(page.locator(".cz-goals")).toContainText("Alejarme en diagonal cuando despega");
  await expect(page.locator(".cz-bars")).toContainText("Mal posicionado");

  await logHunt(page, { monster: "Rey Dau", time: "15:55", causes: ["Ataqué de más"] });
  await logHunt(page, { monster: "Arkveld", weapon: "Gran Espada", time: "22:10", carts: "2" });

  // Per-monster page: stats + trend chart.
  await page.getByRole("link", { name: "Rey Dau" }).first().click();
  await expect(page).toHaveURL("/cuaderno/monstruo/rey-dau");
  await expect(page.getByRole("img", { name: /tiempo de caza de Rey Dau/ })).toBeVisible();
  await expect(page.getByText("2:45 más rápido que tu primera caza")).toBeVisible();

  // Edit the Arkveld hunt.
  await go(page, "/cuaderno?monstruo=arkveld");
  await page.locator("summary", { hasText: "Arkveld" }).click();
  await page.getByRole("link", { name: "Editar" }).click();
  await expect(page.getByLabel("Tiempo (mm:ss)")).toHaveValue("22:10");
  await page.getByLabel("Tiempo (mm:ss)").fill("20:00");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await page.waitForURL(/abierta=/);
  await expect(page.locator("details[open]")).toContainText("20:00");

  // Repeat against the same monster pre-fills monster + weapon only.
  await page.getByRole("link", { name: "Repetir contra este monstruo" }).click();
  await expect(page.getByLabel("Monstruo")).toHaveValue("Arkveld");
  await expect(page.getByLabel("Arma")).toHaveValue("greatsword");
  await expect(page.getByLabel("Tiempo (mm:ss)")).toHaveValue("");

  // Delete with inline confirmation.
  await go(page, "/cuaderno?monstruo=arkveld");
  await page.locator("summary", { hasText: "Arkveld" }).click();
  await page.getByRole("button", { name: "Borrar" }).click();
  await expect(page.getByText("¿Borrar esta cacería?")).toBeVisible();
  await page.getByRole("button", { name: "Borrar" }).click();
  await expect(page.getByText("Ninguna entrada coincide con los filtros.")).toBeVisible();

  // Logout hides the controls again.
  await go(page, "/cuaderno");
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
  await expect(page.locator("summary", { hasText: "Rey Dau" }).first()).toBeVisible();
  await page.locator("summary", { hasText: "Rey Dau" }).first().click();
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
});

test("filters in the query string are server-rendered", async ({ page, request }) => {
  const html = await (await request.get("/cuaderno?monstruo=rey-dau&q=picado")).text();
  expect(html).toContain("cacerías (filtradas)");
  expect(html).toContain("Picado aéreo ×4");
  // Only the matching entry is rendered (the other Rey Dau hunt doesn't match "picado").
  expect(html.match(/class="cz-entry__mon"/g)).toHaveLength(1);

  await go(page, "/cuaderno");
  await page.getByLabel("Buscar").fill("picado");
  await expect(page).toHaveURL(/q=picado/);
  await page.reload();
  await expect(page.getByLabel("Buscar")).toHaveValue("picado");
  await expect(page.locator(".cz-entry")).toHaveCount(1);
});

test("unknown monster page 404s", async ({ request }) => {
  expect((await request.get("/cuaderno/monstruo/no-existe")).status()).toBe(404);
});

test("writes without a valid session return 401 and change nothing", async ({ page, browser, playwright }) => {
  await login(page, "/cuaderno/nueva");
  // Capture a real create request, then replay it without the cookie.
  let captured: { url: string; headers: Record<string, string>; body: string | null } | undefined;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/_serverFn/") && !captured) {
      captured = { url: r.url(), headers: r.headers(), body: r.postData() };
    }
  });
  await page.getByLabel("Monstruo").fill("Gore Magala");
  await page.getByRole("button", { name: "Guardar cacería" }).click();
  await page.waitForURL(/abierta=/);
  expect(captured).toBeDefined();

  const { cookie: _drop, ...headers } = captured!.headers;
  const anon = await playwright.request.newContext();
  const res = await anon.fetch(captured!.url, { method: "POST", headers, data: captured!.body ?? undefined });
  expect(res.status()).toBe(401);

  // A tampered session cookie is not the owner either.
  const [cookie] = (await page.context().cookies()).filter((c) => c.name === "cuaderno");
  const ctx = await browser.newContext();
  await ctx.addCookies([{ ...cookie!, value: cookie!.value.slice(0, -4) + "AAAA" }]);
  const tampered = await ctx.request.fetch(captured!.url, { method: "POST", headers, data: captured!.body ?? undefined });
  expect(tampered.status()).toBe(401);

  // Only the one legitimate Gore Magala hunt exists.
  const html = await (await anon.get("/cuaderno/monstruo/gore-magala")).text();
  expect(html.match(/cz-entry__mon/g)).toHaveLength(1);
});
