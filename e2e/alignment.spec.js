import { test, expect } from "@playwright/test";

const selectors = {
  textarea: "#editor textarea",
  pre: "#editor pre",
};

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
    return {
      scrollHeight: el.scrollHeight,
      offsetHeight: el.offsetHeight,
      rectLeft: el.getBoundingClientRect().left,
      paddingLeft: parseFloat(cs.paddingLeft) || 0,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      whiteSpace: cs.whiteSpace,
      overflowWrap: cs.overflowWrap,
      wordBreak: cs.wordBreak,
    };
  });
}

async function expectLayersAligned(page) {
  const ta = await grab(page.locator(selectors.textarea));
  const pre = await grab(page.locator(selectors.pre).first());

  expect(pre.offsetHeight).toBe(ta.scrollHeight);

  for (const prop of governing) {
    expect(pre[prop], `pre.${prop} must match textarea.${prop}`).toBe(ta[prop]);
  }

  const taStart = ta.rectLeft + ta.paddingLeft;
  const preStart = pre.rectLeft + pre.paddingLeft;
  expect(Math.abs(taStart - preStart)).toBeLessThan(1);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

test("plain multiline text keeps both layers the same height and font metrics", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({ value: "one\ntwo\nthree\nfour\nfive" }),
  );

  await expectLayersAligned(page);
});

test("a long unbroken token wraps identically in both layers", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({
      value: "x".repeat(200),
      styles: { width: "300px" },
    }),
  );

  await expectLayersAligned(page);

  // anchor the wrap to monospace math, not just to layer parity: if either
  // layer wrapped at the wrong column, height parity alone could still pass
  const wrap = await page
    .locator(selectors.pre)
    .first()
    .evaluate((pre) => {
      const range = document.createRange();
      range.selectNode(pre.firstChild);
      const lineCount = range.getClientRects().length;

      const probe = document.createElement("span");
      probe.textContent = "x";
      pre.appendChild(probe);
      const chWidth = probe.getBoundingClientRect().width;
      probe.remove();

      return { lineCount, chWidth, contentWidth: pre.clientWidth };
    });

  const charsPerLine = Math.floor(wrap.contentWidth / wrap.chWidth + 1e-6);
  expect(wrap.lineCount).toBe(Math.ceil(200 / charsPerLine));
});

test("CJK text stays aligned between textarea and pre", async ({ page }) => {
  await page.evaluate(() =>
    window.createEditor({
      value: "你好世界，这是一段用来测试换行对齐的中文文本。再来一行汉字。",
      styles: { width: "300px" },
    }),
  );

  await expectLayersAligned(page);
});

test("mixed emoji text stays aligned between textarea and pre", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({
      value: "hi 👋 world 🌍 emoji 😀 family 👨‍👩‍👧‍👦 flags 🇯🇵 done 🎉",
      styles: { width: "300px" },
    }),
  );

  await expectLayersAligned(page);
});

test("line numbers shift both layers by the same padding", async ({ page }) => {
  await page.evaluate(() =>
    window.createEditor({
      value: "one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten",
      lineNumbers: true,
    }),
  );

  await expectLayersAligned(page);
});

test("line numbers right-align their digits inside the gutter", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({
      value: Array.from({ length: 10 }, (_, i) => "line " + (i + 1)).join("\n"),
      lineNumbers: true,
    }),
  );

  await expectLayersAligned(page);

  const geo = await page.evaluate(() => {
    const glyphRect = (el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect();
    };
    const gutter = document.querySelectorAll("#editor .yace-line");
    const one = glyphRect(gutter[0]);
    const ten = glyphRect(gutter[9]);

    const pre = document.querySelector("#editor pre");
    const codeStart =
      pre.getBoundingClientRect().left +
      (parseFloat(getComputedStyle(pre).paddingLeft) || 0);

    const probe = document.createElement("span");
    probe.textContent = "0";
    pre.appendChild(probe);
    const ch = probe.getBoundingClientRect().width;
    probe.remove();

    return {
      oneRight: one.right,
      oneLeft: one.left,
      tenRight: ten.right,
      tenLeft: ten.left,
      codeStart,
      ch,
    };
  });

  expect(Math.abs(geo.oneRight - geo.tenRight)).toBeLessThan(1);
  // the one-digit number is pushed right by exactly one glyph — not left-aligned
  expect(Math.abs(geo.oneLeft - geo.tenLeft - geo.ch)).toBeLessThan(1);
  // digits stay in the reserved gutter: their right edge clears the code by ~1ch
  expect(geo.codeStart - geo.tenRight).toBeGreaterThan(geo.ch - 1);
});

test("a custom font size keeps both layers aligned", async ({ page }) => {
  await page.evaluate(() =>
    window.createEditor({
      value: "one\ntwo\nthree",
      styles: { fontSize: "20px" },
    }),
  );

  const pre = await grab(page.locator(selectors.pre).first());
  expect(pre.fontSize).toBe("20px");

  await expectLayersAligned(page);
});

test("a long document stays aligned after scrolling to the bottom", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({
      value: Array.from({ length: 200 }, (_, i) => "line " + i).join("\n"),
    }),
  );

  // scrolling here is measurement setup, not user interaction, so drive it
  // directly rather than through unreliable Control/Meta+End
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  await expectLayersAligned(page);
});
