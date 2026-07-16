import { test, expect } from "@playwright/test";
import { caretRange, modifierKey } from "./support.js";

const selectors = {
  textarea: "#editor textarea",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
  await page.evaluate(() => window.createEditor({ plugins: ["autoClose"] }));
});

test("typing an opening bracket inserts the closing one with the caret inside", async ({
  page,
}) => {
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("(");

  await expect(textarea).toHaveValue("()");
  await expect.poll(() => caretRange(textarea)).toEqual([1, 1]);
});

test("typing the closing bracket before its match steps over it", async ({
  page,
}) => {
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("()");

  await expect(textarea).toHaveValue("()");
  await expect.poll(() => caretRange(textarea)).toEqual([2, 2]);
});

test("backspace inside an empty pair deletes both characters", async ({
  page,
}) => {
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("(");
  await textarea.press("Backspace");

  await expect(textarea).toHaveValue("");
  await expect.poll(() => caretRange(textarea)).toEqual([0, 0]);
});

test("undo removes the inserted pair in a single step", async ({ page }) => {
  await page.evaluate(() =>
    window.createEditor({ plugins: ["history", "autoClose"] }),
  );
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("(");
  await expect(textarea).toHaveValue("()");

  await page.keyboard.press(`${mod}+z`);
  await expect(textarea).toHaveValue("");
});

test("a readonly textarea is never edited", async ({ page }) => {
  await page.evaluate(() => {
    window.editor.textarea.readOnly = true;
  });
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("(");

  await expect(textarea).toHaveValue("");
});
