import { test, expect } from "@playwright/test";

test("the hero headline renders both static lines with theming hooks", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("h1.hero__sr")).toHaveText(
    "yace — yet another code editor",
  );

  const lines = page.locator(".hero__title-line");
  await expect(lines).toHaveCount(2);
  await expect(lines.nth(0)).toHaveText("yet another");
  await expect(lines.nth(1)).toHaveText("code editor");

  // data-text feeds the ::before/::after channel copies that carry the
  // day/night fringe, so it must mirror the visible text
  await expect(lines.nth(0)).toHaveAttribute("data-text", "yet another");
  await expect(lines.nth(1)).toHaveAttribute("data-text", "code editor");
});

function afterDisplay(page) {
  return page
    .locator(".hero__title-line")
    .first()
    .evaluate((el) => getComputedStyle(el, "::after").display);
}

const themeOption = (choice) =>
  `.theme-switch__option[data-theme-choice="${choice}"]`;

// the prefers-color-scheme twins and the [data-theme] twins carry the same
// fringe rule separately, so cover both entry points

test("the headline swaps its fringe between day and night (OS scheme)", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  // night keeps both channel copies; day drops ::after for the outline look
  expect(await afterDisplay(page)).not.toBe("none");

  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  expect(await afterDisplay(page)).toBe("none");
});

test("the headline swaps its fringe between day and night (forced theme)", async ({
  page,
}) => {
  await page.goto("/");

  await page.locator(themeOption("dark")).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await afterDisplay(page)).not.toBe("none");

  await page.locator(themeOption("light")).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await afterDisplay(page)).toBe("none");
});

test("the first tagline paragraph stays static", async ({ page }) => {
  await page.goto("/");

  const spec = page.locator("p.hero__tagline");
  await expect(spec).toContainText("~1.7KB");
  await expect(spec).toContainText("<textarea>");
});

test("the live tagline runs the packaged highlighter pipeline", async ({
  page,
}) => {
  await page.goto("/");

  const live = page.locator("#hero-tagline-live");
  await expect(live.locator("textarea")).toBeDisabled();

  // stage 0 (site) paints the static token accents
  await expect(live.locator(".hero__token--a")).toHaveText("paint");
  await expect(live.locator(".hero__token--b")).toHaveText("tokens");

  // packaged shimmer wraps only its configured word
  await expect(live.locator(".yace-shimmer")).toHaveText("shimmer keywords");

  // packaged sliceGlitch wraps its word with the channel-copy data-text + ink
  await expect(live.locator(".yace-slice-word")).toHaveAttribute(
    "data-text",
    "glitch errors",
  );
  await expect(live.locator(".yace-slice-word__ink")).toHaveText(
    "glitch errors",
  );
});

test("the live tagline reserves its height to avoid layout shift", async ({
  page,
}) => {
  await page.goto("/");

  const live = page.locator("#hero-tagline-live");
  // the shimmer word lands only once the editor has mounted into the reserve
  await expect(live.locator(".yace-shimmer")).toHaveText("shimmer keywords");

  const box = await live.evaluate((el) => ({
    minHeight: getComputedStyle(el).minHeight,
    height: el.getBoundingClientRect().height,
  }));
  // the reserve is the CLS guard; assert it is declared and the mounted editor
  // fills it rather than collapsing
  expect(box.minHeight).toBe("55px");
  expect(box.height).toBeGreaterThanOrEqual(55);
});
