import { test, expect } from "@playwright/test";
import { modifierKey } from "./support.js";

const selectors = {
  textarea: "#editor textarea",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
  await page.evaluate(() =>
    window.createEditor({ plugins: ["toggleComment"] }),
  );
});

test("cmd+/ toggles a line comment on and off", async ({ page }) => {
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("const x = 1;");
  await page.keyboard.press(`${mod}+/`);
  await expect(textarea).toHaveValue("// const x = 1;");

  await page.keyboard.press(`${mod}+/`);
  await expect(textarea).toHaveValue("const x = 1;");
});

test("cmd+/ toggles every line the selection touches", async ({ page }) => {
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("a\nb\nc");
  await page.keyboard.press(`${mod}+a`);
  await page.keyboard.press(`${mod}+/`);
  await expect(textarea).toHaveValue("// a\n// b\n// c");

  await page.keyboard.press(`${mod}+/`);
  await expect(textarea).toHaveValue("a\nb\nc");
});

test("undo restores the pre-toggle text in a single step", async ({ page }) => {
  await page.evaluate(() =>
    window.createEditor({ plugins: ["history", "toggleComment"] }),
  );
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("const x = 1;");
  await page.keyboard.press(`${mod}+/`);
  await expect(textarea).toHaveValue("// const x = 1;");

  await page.keyboard.press(`${mod}+z`);
  await expect(textarea).toHaveValue("const x = 1;");
});

test("a readonly textarea is never edited", async ({ page }) => {
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);
  await textarea.fill("const x = 1;");
  await page.evaluate(() => {
    window.editor.textarea.readOnly = true;
  });

  await page.keyboard.press(`${mod}+/`);

  await expect(textarea).toHaveValue("const x = 1;");
});
