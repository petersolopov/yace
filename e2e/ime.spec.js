import { test, expect } from "@playwright/test";

const selectors = {
  textarea: "#editor textarea",
  pre: "#editor pre",
};

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

test("intermediate composition frames never reach the pre or clobber the textarea", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor());
  const textarea = page.locator(selectors.textarea);
  await textarea.click();

  // Playwright cannot drive a real IME across all engines, so composition is
  // synthesized with the events an IME dispatches; the editor must ignore the
  // isComposing input frames and only commit on compositionend.
  await page.evaluate(() => {
    const ta = window.editor.textarea;
    ta.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
    ta.value = "n";
    ta.dispatchEvent(new InputEvent("input", { isComposing: true, data: "n" }));
    ta.value = "ni";
    ta.dispatchEvent(new InputEvent("input", { isComposing: true, data: "i" }));
  });

  await expect(textarea).toHaveValue("ni");
  await expect(page.locator(selectors.pre)).toHaveText("");
  await expect.poll(() => page.evaluate(() => window.updates)).toEqual([]);

  await page.evaluate(() => {
    const ta = window.editor.textarea;
    ta.value = "你好";
    ta.dispatchEvent(new CompositionEvent("compositionend", { data: "你好" }));
  });

  await expect(textarea).toHaveValue("你好");
  await expect(page.locator(selectors.pre)).toHaveText("你好");
  await expect
    .poll(() => page.evaluate(() => window.updates))
    .toEqual(["你好"]);
});

test("a composition that replaces a selection keeps the committed value", async ({
  page,
}) => {
  await page.evaluate(() => window.createEditor({ value: "hello world" }));
  const textarea = page.locator(selectors.textarea);
  await textarea.click();

  // Home/End caret navigation is cross-engine unstable (see support.js), so
  // select "world" through the API instead
  await page.evaluate(() =>
    window.editor.update({ selectionStart: 6, selectionEnd: 11 }),
  );

  // synthesized IME frames (see WHY above); the replacement is derived from
  // the live selection via setRangeText like a browser does, so a broken
  // composition guard that clobbers the selection makes this fail
  await page.evaluate(() => {
    const ta = window.editor.textarea;
    ta.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
    ta.setRangeText("你", ta.selectionStart, ta.selectionEnd, "end");
    ta.dispatchEvent(
      new InputEvent("input", { isComposing: true, data: "你" }),
    );
    ta.setRangeText("你好", ta.selectionStart - 1, ta.selectionStart, "end");
    ta.dispatchEvent(
      new InputEvent("input", { isComposing: true, data: "你好" }),
    );
  });

  await expect(textarea).toHaveValue("hello 你好");
  await expect(page.locator(selectors.pre)).toHaveText("hello world");

  await page.evaluate(() => {
    const ta = window.editor.textarea;
    ta.dispatchEvent(new CompositionEvent("compositionend", { data: "你好" }));
  });

  await expect(textarea).toHaveValue("hello 你好");
  await expect(page.locator(selectors.pre)).toHaveText("hello 你好");
});

test("chromium drives a real IME composition through CDP and commits cleanly", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Input.imeSetComposition is CDP-only");

  const client = await page.context().newCDPSession(page);
  await page.evaluate(() => window.createEditor());
  const textarea = page.locator(selectors.textarea);
  await textarea.click();

  await client.send("Input.imeSetComposition", {
    text: "ni",
    selectionStart: 2,
    selectionEnd: 2,
  });
  await expect(page.locator(selectors.pre)).not.toContainText("ni");

  await client.send("Input.insertText", { text: "你好" });

  await expect(textarea).toHaveValue("你好");
  await expect(page.locator(selectors.pre)).toHaveText("你好");
});
