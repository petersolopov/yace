import { test, expect } from "@playwright/test";

const selectors = {
  textarea: "#editor textarea",
  pre: "#editor pre",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

test("an HTML payload passed as the initial value renders as literal text", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({ value: "<img src=x onerror=window.__pwned=1>" })
  );

  await expect(page.locator("#editor pre img")).toHaveCount(0);
  await expect(page.locator(selectors.pre)).toHaveText(
    "<img src=x onerror=window.__pwned=1>"
  );
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test("the line numbers layer escapes HTML too", async ({ page }) => {
  await page.evaluate(() =>
    window.createEditor({
      value: "<img src=x onerror=window.__pwned=1>\nsecond line",
      lineNumbers: true,
    })
  );

  await expect(page.locator("#editor img")).toHaveCount(0);
  // the lines layer is the second pre; it must render the payload as text
  await expect(page.locator("#editor pre").nth(1)).toContainText(
    "<img src=x onerror=window.__pwned=1>"
  );
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test("a typed HTML payload renders as literal text and does not execute", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor());

  await page
    .locator(selectors.textarea)
    .pressSequentially("<img src=x onerror=window.__pwned=1>");

  await expect(page.locator(selectors.textarea)).toHaveValue(
    "<img src=x onerror=window.__pwned=1>"
  );
  await expect(page.locator("#editor pre img")).toHaveCount(0);
  await expect(page.locator(selectors.pre)).toHaveText(
    "<img src=x onerror=window.__pwned=1>"
  );
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});
