import { test, expect } from "@playwright/test";

const PAYLOAD = "<img src=x onerror=window.__pwned=1>";

test("a typed HTML payload renders as literal text in getting started", async ({
  page,
}) => {
  await page.goto("/");
  const textarea = page.locator("#editor textarea");
  await textarea.click();
  await textarea.pressSequentially(PAYLOAD);

  await expect(page.locator("#editor pre img")).toHaveCount(0);
  await expect(page.locator("#editor pre").first()).toContainText(PAYLOAD);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});
