import { test, expect } from "@playwright/test";

const governing = [
  "fontFamily",
  "fontSize",
  "lineHeight",
  "whiteSpace",
  "overflowWrap",
  "wordBreak",
];

function grab(locator) {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      scrollHeight: el.scrollHeight,
      offsetHeight: el.offsetHeight,
      rectLeft: rect.left,
      rectTop: rect.top,
      paddingLeft: parseFloat(cs.paddingLeft) || 0,
      paddingTop: parseFloat(cs.paddingTop) || 0,
      paddingBottom: parseFloat(cs.paddingBottom) || 0,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      whiteSpace: cs.whiteSpace,
      overflowWrap: cs.overflowWrap,
      wordBreak: cs.wordBreak,
    };
  });
}

// the site editors carry padding (the library fixture does not), so compare the
// content boxes rather than raw heights: the padless pre overlays the padded
// textarea, and both text origins must coincide
async function expectLayersAligned(page, textareaSelector, preSelector) {
  const ta = await grab(page.locator(textareaSelector));
  const pre = await grab(page.locator(preSelector).first());

  const taContent = ta.scrollHeight - ta.paddingTop - ta.paddingBottom;
  const preContent = pre.offsetHeight - pre.paddingTop - pre.paddingBottom;
  expect(preContent).toBe(taContent);

  for (const prop of governing) {
    expect(pre[prop], `pre.${prop} must match textarea.${prop}`).toBe(ta[prop]);
  }

  const taLeft = ta.rectLeft + ta.paddingLeft;
  const preLeft = pre.rectLeft + pre.paddingLeft;
  expect(Math.abs(taLeft - preLeft)).toBeLessThan(1);

  const taTop = ta.rectTop + ta.paddingTop;
  const preTop = pre.rectTop + pre.paddingTop;
  expect(Math.abs(taTop - preTop)).toBeLessThan(1);
}

test("the getting started editor keeps its textarea and pre aligned", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#editor textarea")).toHaveCount(1);
  await expect(page.locator("#editor .yace-tok--kw").first()).toBeVisible();

  await expectLayersAligned(page, "#editor textarea", "#editor pre");
});
