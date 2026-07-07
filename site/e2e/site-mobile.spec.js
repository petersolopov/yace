import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
});

test("key sections are visible at 390px", async ({ page }) => {
  await expect(page.locator(".hero__title")).toBeVisible();
  await expect(page.locator(".getting-started__window")).toBeVisible();
  await expect(page.locator(".features__card")).toHaveCount(4);
  await expect(page.locator(".examples__link")).toHaveCount(6);
  await expect(page.locator(".examples__link").first()).toBeVisible();
  await expect(page.locator(".footer__note")).toBeVisible();
});

test("the theme switch stays visible and usable at 390px", async ({ page }) => {
  await expect(page.locator(".theme-switch")).toBeVisible();

  await page
    .locator('.theme-switch__option[data-theme-choice="light"]')
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("the live tagline uses the mobile type scale at 390px", async ({
  page,
}) => {
  const live = page.locator("#hero-tagline-live");
  // the shimmer word lands only once the editor has mounted into the reserve
  await expect(live.locator(".yace-shimmer")).toHaveText("shimmer keywords");

  const box = await live.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      fontSize: cs.fontSize,
      minHeight: cs.minHeight,
      height: el.getBoundingClientRect().height,
    };
  });
  expect(box.fontSize).toBe("14px");
  expect(box.minHeight).toBe("70px");
  expect(box.height).toBeGreaterThanOrEqual(70);
});

test("page does not scroll horizontally at 390px", async ({ page }) => {
  // the getting started editor is the widest dynamic block; measure once it
  // has mounted so the fully laid-out page counts
  await expect(page.locator("#editor textarea")).toHaveCount(1);

  const overflow = await page.evaluate(() => {
    const root = document.scrollingElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow).toBe(0);
});
