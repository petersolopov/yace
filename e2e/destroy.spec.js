import { test, expect } from "@playwright/test";

const selectors = {
  textarea: "#editor textarea",
  pre: "#editor pre",
  root: "#editor",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

test("destroy removes the editor nodes and restores the container's inline styles", async ({
  page,
}) => {
  await page.locator(selectors.root).evaluate((root) => {
    root.style.fontSize = "40px";
    root.style.position = "static";
  });
  await page.evaluate(() => window.createEditor({ value: "hello" }));

  await expect(page.locator(selectors.textarea)).toHaveCount(1);

  await page.evaluate(() => window.editor.destroy());

  await expect(page.locator(selectors.textarea)).toHaveCount(0);
  await expect(page.locator(selectors.pre)).toHaveCount(0);
  await expect
    .poll(() =>
      page.locator(selectors.root).evaluate((el) => el.style.fontSize),
    )
    .toBe("40px");
  await expect
    .poll(() =>
      page.locator(selectors.root).evaluate((el) => el.style.position),
    )
    .toBe("static");
});

test("re-initializing on the same node yields exactly one working editor", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor());
  await page.evaluate(() => window.editor.destroy());
  await page.evaluate(() => window.createEditor());

  await expect(page.locator(selectors.textarea)).toHaveCount(1);
  await expect(page.locator(selectors.pre)).toHaveCount(1);

  await page.locator(selectors.textarea).pressSequentially("works");

  await expect(page.locator(selectors.textarea)).toHaveValue("works");
  await expect(page.locator(selectors.pre)).toHaveText("works");
});
