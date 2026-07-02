import { test, expect } from "@playwright/test";
import { modifierKey } from "./support.js";

const selectors = {
  textarea: "#editor textarea",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

test("with coalescing off each keystroke is its own undo step", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({
      plugins: [{ name: "history", options: { coalesceMs: 0 } }],
    })
  );
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("abc", { delay: 50 });

  await page.keyboard.press(`${mod}+z`);
  await expect(textarea).toHaveValue("ab");
  await page.keyboard.press(`${mod}+z`);
  await expect(textarea).toHaveValue("a");
  await page.keyboard.press(`${mod}+z`);
  await expect(textarea).toHaveValue("");
});

test("a typed burst within the coalesce window is a single undo step", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({
      plugins: [{ name: "history", options: { coalesceMs: 100000 } }],
    })
  );
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("abc");
  await page.keyboard.press(`${mod}+z`);

  await expect(textarea).toHaveValue("");
});

test("undo then redo round-trips the value", async ({ page }) => {
  await page.evaluate(() =>
    window.createEditor({
      plugins: [{ name: "history", options: { coalesceMs: 0 } }],
    })
  );
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("ab", { delay: 50 });
  await page.keyboard.press(`${mod}+z`);
  await expect(textarea).toHaveValue("a");

  await page.keyboard.press(`${mod}+Shift+z`);
  await expect(textarea).toHaveValue("ab");
});

test("caret-only arrow moves between edits do not add undo steps", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({
      plugins: [{ name: "history", options: { coalesceMs: 0 } }],
    })
  );
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("ab", { delay: 50 });
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");

  await page.keyboard.press(`${mod}+z`);
  await expect(textarea).toHaveValue("a");
  await page.keyboard.press(`${mod}+z`);
  await expect(textarea).toHaveValue("");
});

test("undo reverts a Tab edit and redo reapplies it", async ({ page }) => {
  await page.evaluate(() =>
    window.createEditor({
      plugins: [{ name: "history", options: { coalesceMs: 0 } }, "tab"],
    })
  );
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("ab", { delay: 50 });
  await page.keyboard.press("Tab");
  await expect(textarea).toHaveValue("ab  ");

  await page.keyboard.press(`${mod}+z`);
  await expect(textarea).toHaveValue("ab");

  await page.keyboard.press(`${mod}+Shift+z`);
  await expect(textarea).toHaveValue("ab  ");
});
