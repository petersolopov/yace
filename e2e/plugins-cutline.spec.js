import { test, expect } from "@playwright/test";
import { caretRange, modifierKey } from "./support.js";

const selectors = {
  textarea: "#editor textarea",
};

// clipboard-read and reliable navigator.clipboard access only work under the
// chromium permission model; the plugin no-ops without navigator.clipboard
test.skip(
  ({ browserName }) => browserName !== "chromium",
  "cutLine reads the clipboard, which is only granted in chromium"
);

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

function clipboardText(page) {
  return page.evaluate(() => navigator.clipboard.readText());
}

test("cutting the first line copies it and moves the caret to the new start", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor({ plugins: ["cutLine"] }));
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("one\ntwo\nthree");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press(`${mod}+x`);

  await expect(textarea).toHaveValue("two\nthree");
  await expect.poll(() => caretRange(textarea)).toEqual([0, 0]);
  await expect.poll(() => clipboardText(page)).toBe("one");
});

test("cutting a middle line moves the caret to the start of the following line", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor({ plugins: ["cutLine"] }));
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("one\ntwo\nthree");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press(`${mod}+x`);

  await expect(textarea).toHaveValue("one\nthree");
  await expect.poll(() => caretRange(textarea)).toEqual([4, 4]);
  await expect.poll(() => clipboardText(page)).toBe("two");
});

test("cutting the last line clamps the caret to the new end", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor({ plugins: ["cutLine"] }));
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("one\ntwo\nthree");
  await page.keyboard.press(`${mod}+x`);

  await expect(textarea).toHaveValue("one\ntwo");
  await expect.poll(() => caretRange(textarea)).toEqual([7, 7]);
  await expect.poll(() => clipboardText(page)).toBe("three");
});

test("cutting with a selection copies only the selection", async ({ page }) => {
  await page.evaluate(() => window.createEditor({ plugins: ["cutLine"] }));
  const textarea = page.locator(selectors.textarea);
  const mod = await modifierKey(page);

  await textarea.pressSequentially("hello world");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press(`${mod}+x`);

  await expect(textarea).toHaveValue("hello ");
  await expect.poll(() => caretRange(textarea)).toEqual([6, 6]);
  await expect.poll(() => clipboardText(page)).toBe("world");
});
