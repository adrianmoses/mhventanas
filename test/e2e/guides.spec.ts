import { expect, test } from "@playwright/test";

const GENERAL = "/guias/wilds/chatacabra";
const LONGSWORD = "/guias/wilds/chatacabra/longsword";
const GREATSWORD = "/guias/wilds/chatacabra/greatsword";
const CLIP_URL = "https://cdn.test/wilds/chatacabra/salto-bilis.webm";

test("homepage lists the monster guide server-side and links into it", async ({
  request,
}) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
  const html = await res.text();

  // SSR: the index link is in the raw HTML, not injected after hydration.
  expect(html).toContain("Chatacabra");
  expect(html).toContain(GENERAL);
});

test("homepage links navigate to the guide, and the header returns home", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Chatacabra" }).click();
  await expect(page).toHaveURL(GENERAL);

  // The shared header home link closes the navigation loop.
  await page.getByRole("link", { name: "MH Ventanas" }).click();
  await expect(page).toHaveURL("/");
});

test("general page renders content server-side with only published weapon links", async ({
  request,
}) => {
  const res = await request.get(GENERAL);
  expect(res.status()).toBe(200);
  const html = await res.text();

  // SSR: content is present in the raw HTML, not injected after hydration.
  expect(html).toContain("Anfibio que cubre sus garras de bilis");
  expect(html).toContain(CLIP_URL);
  expect(html).toContain(LONGSWORD);
  // greatsword is unpublished → no link.
  expect(html).not.toContain(GREATSWORD);
});

test("general page hydrates cleanly with a working <video>", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    // The fixture clip points at a fake CDN host (cdn.test) that won't resolve;
    // ignore that resource-load failure — we're checking for React/hydration errors.
    if (msg.type() === "error" && !/Failed to load resource/i.test(msg.text())) {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  await page.goto(GENERAL);

  const video = page.locator("video");
  await expect(video).toHaveAttribute("src", CLIP_URL);
  // Assert the live DOM properties rather than attribute casing.
  expect(await video.evaluate((v: HTMLVideoElement) => v.loop)).toBe(true);
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
  expect(await video.evaluate((v: HTMLVideoElement) => v.autoplay)).toBe(true);

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("published weapon page renders content server-side", async ({ request }) => {
  const res = await request.get(LONGSWORD);
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain("Espada Larga");
});

test("unpublished weapon page returns 404", async ({ request }) => {
  const res = await request.get(GREATSWORD);
  expect(res.status()).toBe(404);
});

test("unknown monster returns 404 with the Spanish not-found view", async ({
  request,
}) => {
  const res = await request.get("/guias/wilds/bogus");
  expect(res.status()).toBe(404);
  expect(await res.text()).toContain("Página no encontrada");
});
