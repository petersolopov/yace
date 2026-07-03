import { test, expect } from "@playwright/test";
import { caretRange, press } from "./support.js";

const selectors = {
  textarea: "#editor textarea",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

test("typing mid-line inserts at the caret instead of the end", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor());
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("helloworld");
  await press(page, "ArrowLeft", 5);
  await page.keyboard.type("X");

  await expect(textarea).toHaveValue("helloXworld");
  await expect.poll(() => caretRange(textarea)).toEqual([6, 6]);
});

test("value-only update preserves the caret in a real browser", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor());
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("abcdef");
  await press(page, "ArrowLeft", 3);

  await page.evaluate(() => window.editor.update({ value: "123456" }));

  await expect(textarea).toHaveValue("123456");
  await expect.poll(() => caretRange(textarea)).toEqual([3, 3]);
});

test("value-only update preserves an active selection", async ({ page }) => {
  await page.evaluate(() => window.createEditor());
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("abcdef");
  await press(page, "ArrowLeft", 2);
  await press(page, "Shift+ArrowLeft", 2);

  await page.evaluate(() => window.editor.update({ value: "ABCDEF" }));

  await expect(textarea).toHaveValue("ABCDEF");
  await expect.poll(() => caretRange(textarea)).toEqual([2, 4]);
});

test("update with an explicit selection applies that selection", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor({ value: "hello world" }));
  const textarea = page.locator(selectors.textarea);

  await page.evaluate(() =>
    window.editor.update({
      value: "goodbye moon",
      selectionStart: 3,
      selectionEnd: 7,
    }),
  );

  await expect(textarea).toHaveValue("goodbye moon");
  await expect.poll(() => caretRange(textarea)).toEqual([3, 7]);
});
