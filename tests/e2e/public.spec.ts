import { expect, test } from "@playwright/test";

test("public foundation loads", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /a liga continua/i }),
  ).toBeVisible();
});

test("login loads", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: /entre na arena/i }),
  ).toBeVisible();
});

test("health endpoint responds", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    status: "ok",
    service: "ultimate-rivals",
  });
});

test("protected portals redirect anonymous users to login", async ({
  page,
}) => {
  for (const route of ["/admin", "/athlete"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }
});
