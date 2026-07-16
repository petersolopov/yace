import { test } from "node:test";
import assert from "node:assert";
import "undom/register.js";

import { defaultRenderers } from "mdhl";
import { code } from "../src/highlighters/code.ts";
import { sliceGlitch } from "../src/highlighters/sliceGlitch.ts";
import { shimmer } from "../src/highlighters/shimmer.ts";
import { markdown } from "../src/highlighters/markdown.ts";
import { injectStyles } from "../src/highlighters/injectStyles.ts";
import {
  code as codeBarrel,
  sliceGlitch as sliceGlitchBarrel,
  shimmer as shimmerBarrel,
  markdown as markdownBarrel,
} from "../src/highlighters/index.ts";

// undom gives document.head but not getElementById; the fun factories call
// injectStyles, which needs it. stub a real registry so their <style> injects
// once per id instead of throwing (see the injectStyles suite for the isolated
// contract, and the report note on the undom incompatibility).
document.getElementById = (id) => document.head.childNodes.find((node) => node.id === id) || null;

test("highlighters barrel re-exports every highlighter, identical to its deep subpath", () => {
  const pairs = [
    ["code", code, codeBarrel],
    ["sliceGlitch", sliceGlitch, sliceGlitchBarrel],
    ["shimmer", shimmer, shimmerBarrel],
    ["markdown", markdown, markdownBarrel],
  ];

  for (const [name, deep, barrel] of pairs) {
    assert.strictEqual(typeof barrel, "function", `${name} barrel export is callable`);
    assert.strictEqual(barrel, deep, `${name} barrel export === its deep subpath`);
  }
});

test("highlighters/code: escapes HTML metacharacters in token text", () => {
  const html = code()("&<>");
  assert.ok(html.includes(">&amp;</span>"), "& becomes &amp;");
  assert.ok(html.includes(">&lt;</span>"), "< becomes &lt;");
  assert.ok(html.includes(">&gt;</span>"), "> becomes &gt;");
});

test("highlighters/code: an XSS payload cannot inject a tag", () => {
  const html = code()("<img src=x onerror=alert(1)>");
  assert.ok(!html.includes("<img"), "the < before img is escaped, not a tag");
  assert.ok(html.includes("&lt;"), "the payload angle brackets are escaped");
});

test("highlighters/code: a malicious rule type cannot break out of the class attribute", () => {
  const html = code([{ type: 'x"><img src=y onerror=alert(1)>', pattern: /a/ }])("a");
  assert.ok(
    html.includes('yace-tok--x&quot;&gt;&lt;img src=y onerror=alert(1)&gt;"'),
    "the rule type is attr-escaped inside the class attribute",
  );
  assert.ok(!html.includes("<img"), "no raw tag breaks out of the attribute");
  assert.ok(!html.includes('yace-tok--x">'), "the quote cannot close the class attribute");
});

test("highlighters/code: extra rules win over the built-ins", () => {
  const html = code([{ type: "cls", pattern: /const/ }])("const");
  assert.deepStrictEqual(
    html,
    '<span class="yace-tok yace-tok--cls">const</span>',
    "the extra rule tags const as cls, not the built-in kw",
  );
});

test("highlighters/code: extra rule flags like /i are preserved", () => {
  const html = code([{ type: "cls", pattern: /abc/i }])("ABC");
  assert.deepStrictEqual(
    html,
    '<span class="yace-tok yace-tok--cls">ABC</span>',
    "the case-insensitive flag still matches uppercase input",
  );
});

test("highlighters/code: plain text between tokens is passed through", () => {
  const html = code()("a const b");
  assert.deepStrictEqual(
    html,
    'a <span class="yace-tok yace-tok--kw">const</span> b',
    "unmatched characters surround the keyword token untouched",
  );
});

test("highlighters/code: newlines are preserved for multi-line input", () => {
  const html = code()("const\n1");
  assert.deepStrictEqual(
    html,
    '<span class="yace-tok yace-tok--kw">const</span>\n<span class="yace-tok yace-tok--num">1</span>',
    "the newline between tokens survives",
  );
});

test("highlighters/code: a zero-length rule match does not spin the scan", () => {
  // /a*/ matches the empty string wherever there is no `a`; without the guard i
  // never advances and the loop hangs. finishing at all proves the fix.
  const html = code([{ type: "z", pattern: /a*/ }])("bbb");
  assert.deepStrictEqual(html, "bbb", "no token is emitted for the empty matches");
});

test("highlighters/sliceGlitch: an empty words array keeps the block mode", () => {
  assert.deepStrictEqual(
    sliceGlitch({ words: [] })("ab"),
    sliceGlitch()("ab"),
    "empty words is byte-for-byte the whole-line block output",
  );
});

test("highlighters/sliceGlitch: words wraps only the matches inline, escaping the rest", () => {
  const html = sliceGlitch({ words: ["cat"] })("a cat b");
  assert.deepStrictEqual(
    html,
    'a <span class="yace-slice-word yace-slice-word--b25-00" style="--ysg-dur:3600ms;--ysg-amp:1;--ysg-fringe:0.035em;--ysg-op:0.95" data-text="cat"><span class="yace-slice-word__ink yace-slice-word__ink--b25-00">cat</span></span> b',
    "the matched word gets -word markup, the surrounding text stays plain",
  );
});

test("highlighters/sliceGlitch: a string word matches literally, a RegExp keeps its flags", () => {
  assert.ok(
    sliceGlitch({ words: [/cat/i] })("CAT").includes(">CAT</span></span>"),
    "the /i flag matches the uppercase occurrence",
  );
});

test("highlighters/sliceGlitch: word text is html-escaped and data-text attr-escaped", () => {
  const html = sliceGlitch({ words: ['a"<b'] })('a"<b');
  assert.ok(html.includes('data-text="a&quot;&lt;b"'), "data-text escapes the quote and angle bracket");
  assert.ok(
    html.includes('__ink yace-slice-word__ink--b25-00">a"&lt;b</span>'),
    "the ink escapes the angle bracket but leaves the quote",
  );
});

test("highlighters/sliceGlitch: words preserves newlines between matches", () => {
  const html = sliceGlitch({ words: ["cat"] })("cat\ndog");
  assert.ok(html.includes("</span>\ndog"), "the newline and the unmatched word survive after the match");
});

test("highlighters/sliceGlitch: a zero-length word pattern does not spin the scan", () => {
  assert.deepStrictEqual(
    sliceGlitch({ words: [/x*/] })("ab"),
    "ab",
    "an empty-matching pattern advances one char at a time, emitting plain text",
  );
});

test("highlighters/sliceGlitch: html context copies prior tags verbatim", () => {
  const html = sliceGlitch({ words: ["cat"] })("<i>cat</i>", { html: true });
  assert.ok(html.startsWith("<i>"), "the opening tag is copied, not scanned or wrapped");
  assert.ok(html.endsWith("</i>"), "the closing tag is copied verbatim");
  assert.ok(html.includes('data-text="cat"'), "the word inside the tags is still wrapped");
});

test("highlighters/shimmer: wraps the whole escaped value in one span", () => {
  assert.deepStrictEqual(
    shimmer()("ab"),
    '<span class="yace-shimmer yace-shimmer--a45-00" style="--ysh-dur:3400ms">ab</span>',
    "block mode is a single shimmer span with the default interval baked in",
  );
});

test("highlighters/shimmer: block mode escapes html metacharacters", () => {
  assert.deepStrictEqual(
    shimmer()("<b>"),
    '<span class="yace-shimmer yace-shimmer--a45-00" style="--ysh-dur:3400ms">&lt;b&gt;</span>',
    "the angle brackets are escaped inside the span",
  );
});

test("highlighters/shimmer: words wraps only the matches", () => {
  assert.deepStrictEqual(
    shimmer({ words: ["cat"] })("a cat"),
    'a <span class="yace-shimmer yace-shimmer--a45-00" style="--ysh-dur:3400ms">cat</span>',
    "only the matched word gets a shimmer span",
  );
});

test("highlighters/shimmer: a lone decorator without context escapes the value", () => {
  const html = shimmer({ words: ["cat"] })("a <cat>");
  assert.ok(html.includes("a &lt;"), "text before the match is escaped");
  assert.ok(html.includes("&gt;"), "text after the match is escaped");
});

test("highlighters/shimmer: html context copies tags without double-escaping", () => {
  const prior = '<span class="yace-tok">a cat &lt;b&gt;</span> cat';
  const html = shimmer({ words: ["cat"] })(prior, { html: true });
  assert.ok(html.includes('<span class="yace-tok">'), "the prior tag is copied verbatim");
  assert.ok(html.includes("&lt;b&gt;"), "already-escaped text is left as-is");
  assert.ok(!html.includes("&amp;lt;"), "the escaped text is not escaped a second time");
  const wrapped = html.match(/yace-shimmer yace-shimmer--a45-00/g) || [];
  assert.deepStrictEqual(wrapped.length, 2, "both cat occurrences in text runs are wrapped");
});

test("highlighters/shimmer: interval and colors bake into the inline vars", () => {
  const html = shimmer({ interval: 5000, colors: { base: "#111", band: "#eee" } })("x");
  assert.ok(
    html.includes('style="--ysh-dur:5000ms;--yace-shimmer-base:#111;--yace-shimmer-band:#eee"'),
    "the interval, base and band land in the inline custom properties",
  );
});

test("highlighters/shimmer: a quote in a color value cannot break out of the style attribute", () => {
  const html = shimmer({ colors: { base: 'red"><img onerror=alert(1) x="' } })("x");
  assert.ok(html.includes("--yace-shimmer-base:red&quot;&gt;&lt;img"), "the color is attr-escaped");
  assert.ok(!html.includes('base:red"'), "no raw quote survives to close the style attribute");
  assert.ok(!html.includes("<img"), "the injected tag never lands as markup");
});

test("highlighters/shimmer: the variant key comes from the active fraction", () => {
  assert.ok(shimmer()("x").includes("yace-shimmer--a45-00"), "the default sweep is 45% of the interval");
  assert.ok(
    shimmer({ interval: 4000, duration: 1000 })("x").includes("yace-shimmer--a25-00"),
    "a 1000ms sweep over a 4000ms interval is 25%",
  );
});

test("highlighters/shimmer: the active fraction is clamped to 3..100", () => {
  assert.ok(
    shimmer({ interval: 10000, duration: 100 })("x").includes("yace-shimmer--a3-00"),
    "a 1% sweep is clamped up to 3%",
  );
  assert.ok(
    shimmer({ interval: 1000, duration: 2000 })("x").includes("yace-shimmer--a100-00"),
    "a duration past the interval is clamped to 100%, a continuous shimmer",
  );
});

test("highlighters/sliceGlitch: wraps a logical line in a block span", () => {
  const html = sliceGlitch()("ab");
  assert.deepStrictEqual(
    html,
    '<span class="yace-slice yace-slice--b25-00" style="--ysg-dur:3600ms;--ysg-amp:1;--ysg-fringe:0.035em;--ysg-op:0.95" data-text="ab"><span class="yace-slice__main yace-slice__main--b25-00">ab</span></span>',
    "default slice glitch wraps the line with data-text and inline vars",
  );
});

test("highlighters/sliceGlitch: joins lines without newline separators", () => {
  const html = sliceGlitch()("a\nb");
  assert.ok(!html.includes("\n"), "block spans replace the newline separators");
  const blocks = html.match(/class="yace-slice /g) || [];
  assert.deepStrictEqual(blocks.length, 2, "one block span per logical line");
});

test("highlighters/sliceGlitch: an empty line renders <br/> inside main", () => {
  const html = sliceGlitch()("");
  assert.ok(
    html.includes('<span class="yace-slice__main yace-slice__main--b25-00"><br/></span>'),
    "the empty line keeps its line box with a <br/>",
  );
  assert.ok(html.includes('data-text=""'), "the empty data-text is present");
});

test("highlighters/sliceGlitch: data-text is attr-escaped, main text html-escaped", () => {
  const html = sliceGlitch()('a"<b>');
  assert.ok(
    html.includes('data-text="a&quot;&lt;b&gt;"'),
    "the attribute escapes the quote to &quot; and the angle brackets",
  );
  assert.ok(html.includes('>a"&lt;b&gt;</span>'), "the text content escapes angle brackets but leaves the quote as-is");
});

test("highlighters/sliceGlitch: options are baked into inline custom properties", () => {
  const html = sliceGlitch({
    interval: 7000,
    shift: 2,
    fringe: 0.05,
    opacity: 0.5,
  })("x");
  assert.ok(
    html.includes('style="--ysg-dur:7000ms;--ysg-amp:2;--ysg-fringe:0.05em;--ysg-op:0.5"'),
    "interval, shift, fringe and opacity land in the inline vars",
  );
});

test("highlighters/sliceGlitch: variant key comes from the duration fraction", () => {
  assert.ok(sliceGlitch()("x").includes("yace-slice--b25-00"), "the default flash is 25% of the interval");
  assert.ok(
    sliceGlitch({ interval: 10000, duration: 600 })("x").includes("yace-slice--b6-00"),
    "a 600ms flash over a 10000ms interval is 6%",
  );
});

test("highlighters/sliceGlitch: the duration fraction is clamped to 3..85", () => {
  assert.ok(
    sliceGlitch({ interval: 10000, duration: 100 })("x").includes("yace-slice--b3-00"),
    "a 1% flash is clamped up to 3%",
  );
  assert.ok(
    sliceGlitch({ interval: 1000, duration: 2000 })("x").includes("yace-slice--b85-00"),
    "a duration longer than the interval is clamped down to 85%, a continuous glitch",
  );
});

// reverse mdhl's output back to source text: <br/> is its rendered newline, tags carry
// no advance, entities decode to their char — equality with the input proves markdown
// preserves every character
function toText(html) {
  return html
    .replace(/<br\/>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&");
}

test("highlighters/markdown: a raw HTML payload in the value is escaped", () => {
  const html = markdown()("<img src=x onerror=alert(1)>");
  assert.ok(!html.includes("<img"), "the tag is escaped, not passed through as markup");
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"), "the angle brackets become entities");
});

test("highlighters/markdown: headings, strong, em and fences emit mdhl-* classes", () => {
  assert.ok(markdown()("# Title").includes('class="mdhl-heading"'), "heading");
  assert.ok(markdown()("**bold**").includes('class="mdhl-strong"'), "strong");
  assert.ok(markdown()("*italic*").includes('class="mdhl-em"'), "em");
  assert.ok(markdown()("```\ncode\n```").includes('class="mdhl-codeInFences"'), "fenced code");
});

test("highlighters/markdown: a space-only line keeps its spaces (mdhl 0.0.7 fix)", () => {
  const input = "a\n   \nb";
  assert.deepStrictEqual(toText(markdown()(input)), input, "the whitespace-only line survives the lexer");
});

test("highlighters/markdown: an indented code fence keeps its leading indent (mdhl 0.0.7 fix)", () => {
  const input = "   ```\ncode\n```";
  assert.deepStrictEqual(toText(markdown()(input)), input, "the fence's leading spaces are preserved");
});

test("highlighters/markdown: a newline renders as <br/>", () => {
  assert.ok(markdown()("a\nb").includes("<br/>"), "the line break becomes a <br/>");
});

test("highlighters/markdown: a throwing renderer falls back to the escaped value", () => {
  // drive the catch branch without a mock: highlight()'s default renderers
  // argument binds defaultRenderers at call time, so mutating it here is visible.
  // a plain paragraph routes through the paragraph renderer; restore in finally.
  const original = defaultRenderers.paragraph;
  defaultRenderers.paragraph = () => {
    throw new Error("boom");
  };
  try {
    const html = markdown()("a & b");
    assert.deepStrictEqual(html, "a &amp; b", "the raw value comes back escaped, not highlighted");
    assert.ok(!html.includes("mdhl-"), "no highlighter markup leaked — the fallback ran");
  } finally {
    defaultRenderers.paragraph = original;
  }
});

// injectStyles reads the global document; swap it wholesale so the guards can
// be exercised without a real DOM, then restore.
function withDocument(fake, fn) {
  const real = globalThis.document;
  globalThis.document = fake;
  try {
    fn();
  } finally {
    globalThis.document = real;
  }
}

test("highlighters/injectStyles: returns quietly when the document has no head", () => {
  withDocument({ head: null }, () => {
    assert.doesNotThrow(() => injectStyles("id", "body{}"));
  });
});

test("highlighters/injectStyles: returns quietly when there is no document", () => {
  withDocument(undefined, () => {
    assert.doesNotThrow(() => injectStyles("id", "body{}"));
  });
});

test("highlighters/injectStyles: injects the style once per id", () => {
  const registry = new Map();
  const appended = [];
  let created = 0;
  const fake = {
    head: {
      appendChild(node) {
        appended.push(node);
        if (node.id) registry.set(node.id, node);
      },
    },
    getElementById: (id) => registry.get(id) || null,
    createElement: (tag) => {
      created += 1;
      return { tag, id: "", textContent: "" };
    },
  };

  withDocument(fake, () => {
    injectStyles("dup", "a{}");
    injectStyles("dup", "a{}");
    assert.deepStrictEqual(created, 1, "the second call with the same id no-ops");
    assert.deepStrictEqual(appended.length, 1, "only one style is appended");
    assert.deepStrictEqual(appended[0].textContent, "a{}", "the css is set");

    injectStyles("other", "b{}");
    assert.deepStrictEqual(created, 2, "a new id injects a fresh style");
    assert.deepStrictEqual(appended.length, 2, "the new style is appended");
  });
});
