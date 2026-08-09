import { expect, test } from "@playwright/test";

test("public foundation loads", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /a liga continua/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /calendario/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /equipes/i })).toBeVisible();
});

test("public calendar uses published QA data only", async ({ page }) => {
  await page.goto("/calendar");
  await expect(
    page.getByRole("heading", { name: /calendario ultimate rivals/i }),
  ).toBeVisible();
  await expect(page.getByText(/\[QA\] UR Play Publico/i)).toBeVisible();
  await expect(page.getByText(/email|telefone/i)).toHaveCount(0);
});

test("public teams page hides operational private data", async ({ page }) => {
  await page.goto("/teams");
  await expect(
    page.getByRole("heading", { name: /times ultimate rivals/i }),
  ).toBeVisible();
  await expect(page.getByText(/email|telefone|wallet|pagamentos/i)).toHaveCount(
    0,
  );
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
