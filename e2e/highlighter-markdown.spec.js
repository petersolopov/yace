import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/e2e/fixtures/index.html");
});

// Core tests cover textarea-to-plain-pre alignment; this reference isolates
// glyph and line drift introduced by markdown markup.
async function measureMarkdown(
  page,
  value,
  { styles = {}, offsets = [] } = {},
) {
  return page.evaluate(
    ({ value, styles, offsets }) => {
      window.createEditor({ value, styles, highlighters: ["markdown"] });
      const pre = document.querySelector("#editor pre");
      const ta = document.querySelector("#editor textarea");

      const escapeHtml = (s) =>
        s
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      // plain reference: escaped value with mdhl's \n->\<br/> convention and the
      // editor's trailing \<br/>, positioned over the real pre with its metrics.
      // pre padding is 0, so a content-box ref at the pre's box-left starts its
      // glyphs at the same origin
      const ref = document.createElement("pre");
      const cs = getComputedStyle(pre);
      const metrics = [
        "fontStyle",
        "fontVariant",
        "fontWeight",
        "fontStretch",
        "fontSize",
        "lineHeight",
        "fontFamily",
        "letterSpacing",
        "wordSpacing",
        "tabSize",
        "whiteSpace",
        "overflowWrap",
        "wordBreak",
        "textIndent",
        "textAlign",
        "textTransform",
      ];
      for (const p of metrics) ref.style[p] = cs[p];
      ref.style.margin = "0";
      ref.style.padding = "0";
      ref.style.boxSizing = "content-box";
      ref.style.position = "fixed";
      ref.style.visibility = "hidden";
      const rect = pre.getBoundingClientRect();
      ref.style.left = rect.left + "px";
      ref.style.top = rect.top + "px";
      ref.style.width = pre.clientWidth + "px";
      ref.innerHTML = escapeHtml(value).replace(/\n/g, "<br/>") + "<br/>";
      document.body.appendChild(ref);

      // one raw offset per rendered char and per \<br/> (mdhl renders \n as \<br/>)
      const stream = (container) => {
        const out = [];
        let raw = 0;
        const walker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        );
        let node = walker.nextNode();
        while (node) {
          if (node.nodeType === 3) {
            for (let i = 0; i < node.nodeValue.length; i++) {
              out.push({ node, i, raw: raw++ });
            }
          } else if (node.nodeName === "BR") {
            out.push({ br: true, raw: raw++ });
          }
          node = walker.nextNode();
        }
        return out;
      };

      const glyphAt = (container, offset) => {
        const hit = stream(container).find((e) => e.raw === offset);
        if (!hit || hit.br) return null;
        const range = document.createRange();
        range.setStart(hit.node, hit.i);
        range.setEnd(hit.node, hit.i + 1);
        const rc = range.getBoundingClientRect();
        return { x: rc.left, y: rc.top };
      };

      // markdown pre text with \<br/> restored to \n, for the preservation check
      const preText = () => {
        let out = "";
        for (const e of stream(pre)) {
          if (e.raw >= value.length) break;
          out += e.br ? "\n" : e.node.nodeValue[e.i];
        }
        return out;
      };

      const probes = [];
      let off = 0;
      for (const line of value.split("\n")) {
        if (line.length > 0) probes.push(off);
        off += line.length + 1;
      }
      probes.push(...offsets);

      let maxDx = 0;
      let maxDy = 0;
      let missing = 0;
      for (const o of probes) {
        const g = glyphAt(pre, o);
        const rg = glyphAt(ref, o);
        if (!g || !rg) {
          missing++;
          continue;
        }
        maxDx = Math.max(maxDx, Math.abs(g.x - rg.x));
        maxDy = Math.max(maxDy, Math.abs(g.y - rg.y));
      }

      ref.remove();
      return {
        preserved: preText() === value,
        heightDelta: pre.offsetHeight - ta.scrollHeight,
        maxDx,
        maxDy,
        missing,
      };
    },
    { value, styles, offsets },
  );
}

async function expectAligned(page, value, { styles = {}, offsets = [] } = {}) {
  const m = await measureMarkdown(page, value, { styles, offsets });
  expect(m.preserved, "markdown pre text equals the source value").toBe(true);
  expect(
    Math.abs(m.heightDelta),
    "pre height tracks the textarea scrollHeight",
  ).toBeLessThan(1);
  expect(m.missing, "every probed offset has a glyph in both layers").toBe(0);
  expect(
    m.maxDx,
    "per-line first-glyph x matches the plain reference",
  ).toBeLessThan(1);
  expect(
    m.maxDy,
    "per-line first-glyph y matches the plain reference",
  ).toBeLessThan(1);
}

test("a heading with bold glyphs keeps the highlighted layer aligned", async ({
  page,
}) => {
  const value =
    "# Heading **bold** text and more words after the bold run\nplain second line";
  // the glyph after the bold run and the last char of the line: a wider bold
  // face would shift every following glyph away from the caret
  const afterBold = value.indexOf(" text") + 1;
  const lastChar = value.indexOf("\n") - 1;
  await expectAligned(page, value, { offsets: [afterBold, lastChar] });
});

test("an indented code fence keeps the highlighted layer aligned", async ({
  page,
}) => {
  const value = "text before\n  ```js\n  const x = 1;\n  ```\ntext after";
  // the fence backtick, the code, and the closing fence all sit behind the
  // 2-space indent that mdhl 0.0.7 stopped dropping
  const openFence = value.indexOf("```");
  const codeChar = value.indexOf("const");
  const closeFence = value.lastIndexOf("```");
  await expectAligned(page, value, {
    offsets: [openFence, codeChar, closeFence],
  });
});

test("a space-only line that wraps stays aligned", async ({ page }) => {
  const value = "before\n" + " ".repeat(220) + "\nafter";
  await expectAligned(page, value, { styles: { width: "300px" } });
});

test("a trailing empty line keeps both layers the same height", async ({
  page,
}) => {
  await expectAligned(page, "line one\nline two\n");
});

test("a typed <script> payload renders escaped and does not execute", async ({
  page,
}) => {
  await page.evaluate(() =>
    window.createEditor({ highlighters: ["markdown"] }),
  );
  const textarea = page.locator("#editor textarea");

  await textarea.pressSequentially("<script>window.__pwned=1</script>");

  await expect(page.locator("#editor pre script")).toHaveCount(0);
  await expect(page.locator("#editor pre")).toContainText(
    "<script>window.__pwned=1</script>",
  );
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});
