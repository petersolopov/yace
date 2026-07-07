import { test, expect } from "@playwright/test";
import { caretRange } from "./support.js";

const selectors = {
  textarea: "#editor textarea",
  pre: "#editor pre",
  root: "#editor",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

test("updateOptions re-renders the current value with the new highlighters", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor({ value: "hello" }));

  await page.evaluate(() =>
    window.editor.updateOptions({
      highlighters: [(value) => `<mark>${value}</mark>`],
    }),
  );

  await expect(page.locator("#editor pre mark")).toHaveText("hello");
});

test("toggling line numbers on then off updates the DOM and restores padding", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({
      value: "one\ntwo\nthree",
      styles: { paddingLeft: "10px" },
    }),
  );

  await expect(page.locator(selectors.pre)).toHaveCount(1);

  await page.evaluate(() => window.editor.updateOptions({ lineNumbers: true }));
  await expect(page.locator(selectors.pre)).toHaveCount(2);
  await expect
    .poll(() =>
      page.locator(selectors.root).evaluate((el) => el.style.paddingLeft),
    )
    .toBe("2ch");

  await page.evaluate(() =>
    window.editor.updateOptions({ lineNumbers: false }),
  );
  await expect(page.locator(selectors.pre)).toHaveCount(1);
  await expect
    .poll(() =>
      page.locator(selectors.root).evaluate((el) => el.style.paddingLeft),
    )
    .toBe("10px");
});

test("updateOptions applies new container styles", async ({ page }) => {
  await page.evaluate(() => window.createEditor({ value: "hello" }));

  await page.evaluate(() =>
    window.editor.updateOptions({ styles: { background: "rgb(0, 128, 0)" } }),
  );

  await expect
    .poll(() =>
      page
        .locator(selectors.root)
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    .toBe("rgb(0, 128, 0)");
});

test("updateOptions with a new value fires onUpdate", async ({ page }) => {
  await page.evaluate(() => window.createEditor({ value: "old" }));

  await page.evaluate(() => window.editor.updateOptions({ value: "new" }));

  await expect(page.locator(selectors.textarea)).toHaveValue("new");
  await expect.poll(() => page.evaluate(() => window.updates)).toContain("new");
});

test("updateOptions preserves the caret across prop changes", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor({ value: "hello world" }));
  const textarea = page.locator(selectors.textarea);

  // drive the caret through the API: keyboard navigation is cross-engine
  // unstable (see support.js)
  await page.evaluate(() =>
    window.editor.update({ selectionStart: 3, selectionEnd: 5 }),
  );

  await page.evaluate(() =>
    window.editor.updateOptions({
      highlighters: [(value) => value.toUpperCase()],
    }),
  );
  await expect.poll(() => caretRange(textarea)).toEqual([3, 5]);

  await page.evaluate(() => window.editor.updateOptions({ lineNumbers: true }));
  await expect.poll(() => caretRange(textarea)).toEqual([3, 5]);
});
