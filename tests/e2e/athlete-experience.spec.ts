import { expect, test, type Page } from "@playwright/test";

const password = process.env.UR_TEST_PASSWORD ?? "";
if (!password)
  throw new Error("UR_TEST_PASSWORD is required for athlete E2E tests.");

async function login(page: Page) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.context().clearCookies();
      await page.goto("/login");
      await page.getByLabel("E-mail").fill("athlete@test.ur.local");
      await page.getByLabel("Senha").fill(password);
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page).toHaveURL(/\/athlete/, { timeout: 30_000 });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 2) throw error;
      await page.waitForTimeout(1_500);
    }
  }
  throw lastError;
}

test("athlete season hub opens without private PII", async ({
  page,
}, testInfo) => {
  await login(page);
  await page.goto("/athlete");
  await expect(page.getByText(/season hub/i)).toBeVisible();
  await expect(page.getByText(/seu próximo passo/i)).toBeVisible();
  await expect(page.getByText(/ranking como competição viva/i)).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /@test\.ur\.local|Telefone|Data de nascimento|service_role|storage_path|signed_url/i,
  );
  await page.screenshot({
    path: testInfo.outputPath(`athlete-home-${testInfo.project.name}.png`),
    fullPage: true,
  });
});

test("mobile athlete navigation covers five primary destinations", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile navigation scenario");
  test.setTimeout(90_000);
  await login(page);
  const nav = page.getByRole("navigation", {
    name: "Navegação principal do atleta",
  });
  await expect(nav).toBeVisible();
  const expected = ["Início", "Agenda", "Ranking", "Temporada", "Perfil"];
  await expect(nav.getByRole("link")).toHaveCount(expected.length);
  for (const item of expected) {
    await nav.getByRole("link", { name: item }).click();
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
  }
  await page.screenshot({
    path: testInfo.outputPath("mobile-primary-navigation.png"),
    fullPage: true,
  });
});

test("mobile athlete pages provide the requested screenshots", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile screenshot scenario");
  test.setTimeout(90_000);
  await login(page);

  for (const item of [
    {
      path: "/athlete/agenda",
      heading: /^Minha agenda e calend.rio$/i,
      file: "agenda-mobile.png",
    },
    {
      path: "/athlete/ranking",
      heading: /^Meu ranking$/i,
      file: "ranking-mobile.png",
    },
    {
      path: "/athlete/season",
      heading: /^Da primeira reserva/i,
      file: "season-mobile.png",
    },
  ]) {
    await page.goto(item.path);
    await expect(page.getByRole("heading", { name: item.heading })).toBeVisible({
      timeout: 20_000,
    });
    await page.screenshot({
      path: testInfo.outputPath(item.file),
      fullPage: true,
    });
  }
});

test("compact 360px shell keeps touch-friendly destinations", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Compact mobile scenario");
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page);
  const links = page
    .getByRole("navigation", { name: "Navegação principal do atleta" })
    .getByRole("link");
  await expect(links).toHaveCount(5);
  for (let index = 0; index < 5; index++) {
    const box = await links.nth(index).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("desktop athlete shell exposes season centers", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "Desktop navigation scenario",
  );
  await login(page);
  const nav = page.getByRole("navigation", { name: "Navegação do atleta" });
  await expect(nav).toBeVisible();

  await nav.getByRole("link", { name: "Agenda", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/agenda/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: /Minha agenda e calendário/i }),
  ).toBeVisible({ timeout: 20_000 });
  await page.screenshot({
    path: testInfo.outputPath("agenda-desktop.png"),
    fullPage: true,
  });

  await nav.getByRole("link", { name: "Ranking", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/ranking/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Meu ranking" })).toBeVisible({
    timeout: 20_000,
  });
  await page.screenshot({
    path: testInfo.outputPath("ranking-desktop.png"),
    fullPage: true,
  });

  await nav.getByRole("link", { name: "Temporada", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/season/, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { name: /Da primeira reserva/i }),
  ).toBeVisible({ timeout: 20_000 });
  await page.screenshot({
    path: testInfo.outputPath("season-desktop.png"),
    fullPage: true,
  });

  await nav.getByRole("link", { name: "Perfil", exact: true }).click();
  await expect(page).toHaveURL(/\/athlete\/profile/, { timeout: 20_000 });
  await page.screenshot({
    path: testInfo.outputPath("profile-desktop.png"),
    fullPage: true,
  });
});

test("athlete agenda captures interest and reservation states", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop QA state scenario");
  test.setTimeout(90_000);
  await login(page);
  await page.goto("/athlete/agenda");

  const interestCard = page
    .getByRole("heading", { name: "[QA] Interesse - Duplas", exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'bg-ur-graphite')][1]");
  await expect(interestCard).toBeVisible({ timeout: 20_000 });
  const startInterest = interestCard.getByRole("button", {
    name: "Tenho interesse",
    exact: true,
  });
  if (await startInterest.count()) await startInterest.click();
  await expect(
    interestCard.getByRole("button", {
      name: "Atualizar interesse",
      exact: true,
    }),
  ).toBeVisible({ timeout: 20_000 });
  await page.screenshot({
    path: testInfo.outputPath("interest-desktop.png"),
    fullPage: true,
  });

  const reservationCard = page
    .getByRole("heading", { name: "[QA] Reserva - Duplas", exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'bg-ur-graphite')][1]");
  await expect(reservationCard).toBeVisible({ timeout: 20_000 });
  const startReservation = reservationCard.getByRole("button", {
    name: "Reservar",
    exact: true,
  });
  if (await startReservation.count()) await startReservation.click();
  await expect(
    reservationCard.getByRole("button", { name: "reserved", exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await page.screenshot({
    path: testInfo.outputPath("reservation-desktop.png"),
    fullPage: true,
  });
});

test("athlete profile saves a synthetic photo", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop photo scenario");
  test.setTimeout(90_000);
  await login(page);
  await page.goto("/athlete/profile");

  const imageBase64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context unavailable");
    const gradient = context.createLinearGradient(0, 0, 128, 128);
    gradient.addColorStop(0, "#f4c430");
    gradient.addColorStop(0.5, "#1d4ed8");
    gradient.addColorStop(1, "#111827");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = "rgba(255,255,255,.75)";
    context.beginPath();
    context.arc(64, 52, 24, 0, Math.PI * 2);
    context.fill();
    context.fillRect(30, 80, 68, 28);
    return canvas.toDataURL("image/png").split(",")[1] ?? "";
  });
  await page.getByLabel("Selecionar foto do perfil").setInputFiles({
    name: "qa-athlete-photo.png",
    mimeType: "image/png",
    buffer: Buffer.from(imageBase64, "base64"),
  });
  await expect(page.getByAltText("Preview do recorte")).toBeVisible();
  await page
    .getByRole("button", { name: /Salvar foto|Substituir foto/ })
    .click();
  await expect(page.getByRole("status")).toContainText("Foto normalizada", {
    timeout: 20_000,
  });

  await page.reload();
  const avatar = page.getByLabel("Avatar de [QA] Athlete A").first();
  const image = avatar.locator("img");
  await expect(image).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(async () =>
      image.evaluate((element) =>
        (element as HTMLImageElement).naturalWidth > 0,
      ),
    )
    .toBe(true);

  const publicPhoto = page.getByLabel(/Mostrar minha foto/i);
  if (!(await publicPhoto.isChecked())) await publicPhoto.check();
  await page.getByRole("button", { name: "Salvar privacidade" }).click();
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByLabel(/Mostrar minha foto/i)).toBeChecked();
  await page.screenshot({
    path: testInfo.outputPath("profile-photo-desktop.png"),
    fullPage: true,
  });
});
