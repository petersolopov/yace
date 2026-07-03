import { test, expect } from "@playwright/test";
import { caretRange, press } from "./support.js";

const selectors = {
  textarea: "#editor textarea",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

test("Enter at the end of an indented line continues the indent", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({ plugins: ["preserveIndent"] }),
  );
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("  hello");
  await page.keyboard.press("Enter");

  await expect(textarea).toHaveValue("  hello\n  ");
  await expect.poll(() => caretRange(textarea)).toEqual([10, 10]);
});

test("Enter at column 0 of an indented line does not double the indent", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({ plugins: ["preserveIndent"] }),
  );
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("  hello");
  await press(page, "ArrowLeft", 7);
  await page.keyboard.press("Enter");

  await expect(textarea).toHaveValue("\n  hello");
  await expect.poll(() => caretRange(textarea)).toEqual([1, 1]);
});

test("Enter on an unindented line inserts a plain newline", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({ plugins: ["preserveIndent"] }),
  );
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("hello");
  await page.keyboard.press("Enter");

  await expect(textarea).toHaveValue("hello\n");
  await expect.poll(() => caretRange(textarea)).toEqual([6, 6]);
});
