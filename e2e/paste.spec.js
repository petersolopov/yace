import { test, expect } from "@playwright/test";
import { modifierKey } from "./support.js";

const selectors = {
  textarea: "#editor textarea",
  pre: "#editor pre",
};

// the real clipboard is shared mutable state, so parallel pastes would race
test.describe.configure({ mode: "serial" });

// reliable navigator.clipboard access and paste permissions only work under
// the chromium permission model
test.skip(
  ({ browserName }) => browserName !== "chromium",
  "paste needs clipboard permissions, which are only granted in chromium"
);

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

test("pasting inserts the clipboard text into both layers", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor());
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  // seed the OS clipboard so the paste shortcut has something to insert
  await page.evaluate(() => navigator.clipboard.writeText("pasted text"));

  await textarea.click();
  await page.keyboard.press(`${mod}+v`);

  await expect(textarea).toHaveValue("pasted text");
  await expect(page.locator(selectors.pre)).toHaveText("pasted text");
});

test("pasting an HTML payload renders as literal text and creates no elements", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor());
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await page.evaluate(() =>
    navigator.clipboard.writeText("<img src=x onerror=window.__pwned=1>")
  );

  await textarea.click();
  await page.keyboard.press(`${mod}+v`);

  await expect(textarea).toHaveValue("<img src=x onerror=window.__pwned=1>");
  await expect(page.locator(selectors.pre)).toHaveText(
    "<img src=x onerror=window.__pwned=1>"
  );
  await expect(page.locator("#editor pre img")).toHaveCount(0);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});
