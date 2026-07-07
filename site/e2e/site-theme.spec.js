import { test, expect } from "@playwright/test";

const option = (choice) =>
  `.theme-switch__option[data-theme-choice="${choice}"]`;

function bgLuminance(page) {
  return page.evaluate(() => {
    const [r, g, b] = getComputedStyle(document.body)
      .backgroundColor.match(/\d+/g)
      .map(Number);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  });
}

test("system (no explicit choice) follows the OS color scheme", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  expect(await bgLuminance(page)).toBeGreaterThan(200);

  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  expect(await bgLuminance(page)).toBeLessThan(60);
});

test("the light option turns the page background light", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  const darkLuma = await bgLuminance(page);

  await page.locator(option("light")).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  const lightLuma = await bgLuminance(page);
  expect(lightLuma).toBeGreaterThan(darkLuma + 100);
});

test("the dark option forces dark despite a light OS preference", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  await page.locator(option("dark")).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bgLuminance(page)).toBeLessThan(60);
});

test("the switch reflects the choice with aria-pressed", async ({ page }) => {
  await page.goto("/");

  await page.locator(option("light")).click();
  await expect(page.locator(option("light"))).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(option("system"))).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator(option("dark"))).toHaveAttribute(
    "aria-pressed",
    "false",
  );

  await page.locator(option("system")).click();
  await expect(page.locator(option("system"))).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(option("light"))).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator(option("dark"))).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("the chosen theme survives a reload", async ({ page }) => {
  await page.goto("/");

  await page.locator(option("light")).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  // the active pill is CSS driven by data-theme: assert the rendered state
  await expect(page.locator(option("light"))).toHaveCSS(
    "background-color",
    "rgb(214, 0, 110)",
  );
});

test("the system option clears the explicit theme override", async ({
  page,
}) => {
  await page.goto("/");

  await page.locator(option("dark")).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.locator(option("system")).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
});
