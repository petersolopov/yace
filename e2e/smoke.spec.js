import { test, expect } from "@playwright/test";

const selectors = {
  textarea: "#editor textarea",
  pre: "#editor pre",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

test("editor renders a textarea layered over a pre", async ({ page }) => {
  await page.evaluate(() => window.createEditor());

  await expect(page.locator(selectors.textarea)).toHaveCount(1);
  await expect(page.locator(selectors.pre)).toHaveCount(1);
});

test("typing shows the text in both the textarea and the highlighted pre", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor());

  await page.locator(selectors.textarea).pressSequentially("hello");

  await expect(page.locator(selectors.textarea)).toHaveValue("hello");
  await expect(page.locator(selectors.pre)).toHaveText("hello");
});

test("onUpdate reports the value after each keystroke", async ({ page }) => {
  await page.evaluate(() => window.createEditor());

  await page.locator(selectors.textarea).pressSequentially("hi");

  await expect
    .poll(() => page.evaluate(() => window.updates))
    .toEqual(["h", "hi"]);
});

test("a readonly textarea skips keydown plugins", async ({ page }) => {
  await page.evaluate(() => {
    window.createEditor({ plugins: ["autoClose"] });
    window.editor.textarea.readOnly = true;
  });
  const textarea = page.locator(selectors.textarea);

  await textarea.pressSequentially("(");

  await expect(textarea).toHaveValue("");
});

test("initial value renders through the highlighter on load", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor({ value: "hello world" }));

  await expect(page.locator(selectors.textarea)).toHaveValue("hello world");
  await expect(page.locator(selectors.pre)).toHaveText("hello world");
});
