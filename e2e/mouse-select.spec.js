import { test, expect } from "@playwright/test";
import { caretRange } from "./support.js";

const selectors = {
  textarea: "#editor textarea",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

test("a mouse drag selects text through the layered textarea", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({ value: "hello world foo bar baz" }),
  );
  const textarea = page.locator(selectors.textarea);

  const box = await textarea.boundingBox();
  const y = box.y + box.height / 2;

  await page.mouse.move(box.x + 4, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, y, { steps: 10 });
  await page.mouse.up();

  const [start, end] = await caretRange(textarea);
  expect(end).toBeGreaterThan(start);

  // deleting the selection proves the drag landed on the transparent textarea,
  // not just on the pre layer above it
  const value = await textarea.inputValue();
  const expectedAfter = value.slice(0, start) + value.slice(end);

  await page.keyboard.press("Backspace");
  await expect(textarea).toHaveValue(expectedAfter);
});
