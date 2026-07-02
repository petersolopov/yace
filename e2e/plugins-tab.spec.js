import { test, expect } from "@playwright/test";
import { caretRange, modifierKey, press } from "./support.js";

const selectors = {
  textarea: "#editor textarea",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

test("Tab inserts two spaces at the caret", async ({ page }) => {
  await page.evaluate(() => window.createEditor({ plugins: ["tab"] }));
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("abcd");
  await press(page, "ArrowLeft", 2);
  await page.keyboard.press("Tab");

  await expect(textarea).toHaveValue("ab  cd");
  await expect.poll(() => caretRange(textarea)).toEqual([4, 4]);
});

test("Tab indents every line of a multi-line selection and keeps them selected", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor({ plugins: ["tab"] }));
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("one\ntwo\nthree");
  await page.keyboard.press(`${mod}+a`);
  await page.keyboard.press("Tab");

  await expect(textarea).toHaveValue("  one\n  two\n  three");
  await expect.poll(() => caretRange(textarea)).toEqual([2, 19]);
});

test("a selection ending at column 0 does not indent the line below", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor({ plugins: ["tab"] }));
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("one\ntwo\nthree");
  await press(page, "ArrowLeft", 13);
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Tab");

  await expect(textarea).toHaveValue("  one\ntwo\nthree");
});

test("Shift+Tab outdents every selected line", async ({ page }) => {
  await page.evaluate(() => window.createEditor({ plugins: ["tab"] }));
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("  one\n  two\n  three");
  await page.keyboard.press(`${mod}+a`);
  await page.keyboard.press("Shift+Tab");

  await expect(textarea).toHaveValue("one\ntwo\nthree");
});

test("Shift+Tab with the caret inside the indent clamps the selection to column 0", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor({ plugins: ["tab"] }));
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("  one");
  await press(page, "ArrowLeft", 4);
  await page.keyboard.press("Shift+Tab");

  await expect(textarea).toHaveValue("one");
  await expect.poll(() => caretRange(textarea)).toEqual([0, 0]);
});
