# Y A C E

[![npm](https://badgen.net/npm/v/yace/?cache=300)](https://www.npmjs.com/package/yace) [![Coverage Status](https://coveralls.io/repos/github/petersolopov/yace/badge.svg)](https://coveralls.io/github/petersolopov/yace) [![bundlephobia](https://badgen.net/bundlephobia/minzip/yace?label=size)](https://bundlephobia.com/result?p=yace)

Yet another code editor — tiny, framework-agnostic, yours to extend.

- under 2KB gzipped, zero dependencies.
- A real `<textarea>` underneath — native caret, IME, mobile input, and accessibility come for free.
- Bring any highlighter — PrismJS, highlight.js — or chain several as a pipeline.
- Add behavior with plugins — tab, undo/redo, auto-indent — or write your own in a few lines.
- Framework-agnostic: hand it a DOM node and it drops into React or anything else.

<table>
  <tr>
    <td width="50%">
      <video src="https://github.com/user-attachments/assets/701a4455-c987-4f47-a123-a6dca124f4f1"></video>
    </td>
    <td width="50%">
      <video src="https://github.com/user-attachments/assets/e200786f-d4ea-42d3-b50d-3cbf638219c4"></video>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <a href="https://codepen.io/petersolopov/pen/Qwdmjxg">shimmer & glitch playground</a>
    </td>
    <td width="50%" align="center">
      <a href="https://codepen.io/petersolopov/pen/emgMpMr">LLM tokenizer playground</a>
    </td>
  </tr>
</table>

## How it works

A transparent `<textarea>` sits over a highlighted `<pre>`. You type into the textarea; the `<pre>` underneath paints the same text. The core ships no highlighter and no editing behavior — you add highlighters to paint the text and plugins to transform keystrokes.

## Installation

From npm:

```bash
npm i yace
```

Or hotlink the ESM build from unpkg, no build tool required:

```js
import { Yace } from "https://unpkg.com/yace?module";
```

The package is ESM-only — native `import` and bundlers work everywhere; `require`, TypeScript, and Jest have small caveats, see Gotchas.

## Usage

`new Yace(target, options)` takes a CSS selector or a DOM `Node` to mount into:

```html
<div id="editor"></div>
```

```js
import { Yace } from "yace";

const editor = new Yace("#editor", {
  value: "your awesome code",
  lineNumbers: true,
});

editor.onUpdate((value) => console.log(value));
```

`onUpdate` fires on every edit; `editor.value` holds the current text at any time.

## Options

Every option is optional.

```js
new Yace(target, {
  value: "",           // initial text
  highlighters: [],    // highlighter pipeline
  plugins: [],         // keystroke transformers, run left to right
  lineNumbers: false,  // line-number gutter
  styles: {},          // inline styles on the root, e.g. { fontSize: "20px" }
});
```

## Instance API

The DOM yace built, and the methods to drive it:

- `editor.value` — the current text.
- `editor.textarea` — the `<textarea>` element (focus it, toggle `spellcheck`).
- `editor.root` — the element you mounted into.
- `editor.pre` — the `<pre>` layer that shows the highlighted output.
- `editor.onUpdate((value: string) => void)` — register a callback run on every value change.
- `editor.update({ value?: string, selectionStart?: number, selectionEnd?: number })` — set the text and/or selection; a value-only update keeps the current selection.
- `editor.updateOptions({ value?, lineNumbers?, highlighters?, plugins?, styles? })` — change any constructor option on a live editor; the shape matches the constructor's options, `value` included.
- `editor.destroy()` — remove listeners and nodes, restore the container; later `update()` calls no-op.

## Examples

Live pens on CodePen — start simple:

- [Getting started — the bundled `code` highlighter](https://codepen.io/petersolopov/pen/JoELdOr)
- [highlight.js as the highlighter](https://codepen.io/petersolopov/pen/dPNddwg)
- [PrismJS as the highlighter](https://codepen.io/petersolopov/pen/RNKQMaX)
- [First-party plugins: undo, tab, indent, cut a line](https://codepen.io/petersolopov/pen/GgrQxjg)
- [Shimmer & glitch decorations in a pipeline](https://codepen.io/petersolopov/pen/Qwdmjxg)
- [Using with React](https://codepen.io/petersolopov/pen/XJpZEKq)
- [Write your own plugin](https://codepen.io/petersolopov/pen/OPWvyOM)
- [Markdown editor on mdhl](https://codepen.io/petersolopov/pen/NPdyYrR)

And the advanced ones:

- [Write your own highlighter (~15 lines)](https://codepen.io/petersolopov/pen/dPNmYWr)
- [Markdown with highlighted code blocks](https://codepen.io/petersolopov/pen/pvRaLbw)
- [LLM tokenizer — an editable OpenAI-style token view](https://codepen.io/petersolopov/pen/emgMpMr)

## Plugins

A plugin receives the textarea state and the DOM event, and returns the next state (or nothing to leave it unchanged):

```ts
type Plugin = (props: TextareaProps, event: Event) => Partial<TextareaProps> | void;

interface TextareaProps {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}
```

On each `keydown`, `input`, or `compositionend`, yace runs the plugins left to right — each sees the previous one's result — and merges the final `props` back into the textarea.

```js
import { Yace } from "yace";

const upperCase = ({ value }) => ({ value: value.toUpperCase() });

new Yace("#editor", { plugins: [upperCase] });
```

First-party plugins ship as a `yace/plugins` barrel (import several at once) or one-per-file subpaths (`yace/plugins/tab`):

```js
import { Yace } from "yace";
import { history, tab, preserveIndent, cutLine } from "yace/plugins";

new Yace("#editor", {
  // history() must come first: it checkpoints state before other plugins mutate it
  plugins: [history(), tab(), preserveIndent(), cutLine()],
});
```

- `history({ limit = 300, coalesceMs = 300 })` — undo/redo. `limit` caps stored states; edits within `coalesceMs` merge into one step. Must be first in the list.
- `tab(tabCharacter = "  ")` — indent and outdent the selection with tab and shift + tab.
- `preserveIndent()` — keep the current line's indentation on enter.
- `cutLine(predicate?)` — cut the selection or current line to the clipboard on ctrl/cmd + x; `predicate` overrides the trigger. No-ops without `navigator.clipboard`, leaving the native cut in place.
- `autoClose(pairs?)` — type an opening bracket to insert its closing one with the caret between, wrap a selection and keep it selected, step over a closing char you type right before its match, and delete both on backspace inside an empty pair. Each side of a pair is a single character. `pairs` defaults to `{ "(": ")", "[": "]", "{": "}" }`; passing your own replaces that default instead of extending it, so repeat any brackets you want to keep. For example, to keep the brackets and add symmetric quote pairs (open equal to close): `{ "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" }`.

For your own shortcut checks, `yace/plugins/isKey` matches a shortcut against a `KeyboardEvent` — `isKey("ctrl/cmd+z", event)` — with ctrl/cmd normalization and a physical-code fallback that survives non-Latin layouts.

## Highlighting

A highlighter is a function `(value) => html`. yace assigns the returned HTML to `innerHTML`, so it must:

- Escape HTML in user text — `&`, `<`, `>`, and quotes inside attributes. Returning raw input is an XSS vector.
- Keep glyph advance widths constant. Anything that changes them drifts the highlighted layer — and the caret — out of line with the textarea. Bold and italic are safe on a strictly monospace font, see Gotchas.

Highlighters run as a pipeline: `highlighters: Highlighter[]`. The full signature is `(value, context?) => html`: the first stage is called with `context.html` false (or absent) and must escape the raw value; each later stage is called with `context.html === true`, receives the previous stage's HTML, and must be HTML-aware — copy tags through, do not re-escape. An empty array falls back to the built-in escaping highlighter. Drop in PrismJS, highlight.js, or the bundled `code`:

```js
import { Yace } from "yace";
import { code } from "yace/highlighters/code";

new Yace("#editor", {
  value: "const answer = 42;",
  highlighters: [code()],
});
```

Chaining is the point of the pipeline: `[code(), shimmer({ words: ["TODO"] })]` tokenizes first, then decorates on top. Only the first stage may escape its whole input — a plain tokenizer like `code()` placed later would double-escape the HTML before it.

**Bundled extras.** yace ships a few optional highlighters as a `yace/highlighters` barrel or one-per-file subpaths (`yace/highlighters/code`). No separate stylesheet is needed — `code` emits classes only (bring your own colors), while the decorative highlighters inject their animation CSS at runtime and expose classes plus CSS variables you theme.

- `code(extraRules?)` — an extensible tokenizer. Emits `<span class="yace-tok yace-tok--type">` per token, no colors of its own. Pass `extraRules` (`{ type, pattern }[]`, tried before the built-ins) to add token types; flags on your patterns (`/i`, `/u`, `/s`) are kept.
- `sliceGlitch(options?)` — decorative glitch that shatters each line into displaced RGB slices. `interval = 3600`, `duration = 900`, `shift = 1`, `fringe = 0.035` (em), `opacity = 0.95`; `duration ≥ interval` clamps to an 85% active fraction, not fully continuous. Colors: `--yace-slice-a` / `--yace-slice-b`.
- `shimmer(options?)` — a light band sweeps across the text, then rests. `interval = 3400`, `duration = 1530`; theme via `--yace-shimmer-base` / `--yace-shimmer-band` or a JS `colors: { base, band }` option.

The decorative highlighters (`sliceGlitch`, `shimmer`) also take a `words` array to decorate only the matching words inline and leave the rest as plain text.

## Browser support

Evergreen Chromium, Firefox, and WebKit, plus current mobile browsers. No IE. yace is client-only — it needs the DOM and does not render on the server.

## Non-goals

Large documents, multicursor, decorations, rich text, and SSR are out of scope by design.

## Gotchas

- The barrels (`yace/plugins`, `yace/highlighters`) are fine with a bundler — tree-shaking keeps only what you import. Loading modules natively (CDN, import maps) prefer the exact paths like `yace/plugins/tab`: with a barrel the browser fetches every sibling module.
- `require("yace")` on Node 22+ (which supports `require` of an ESM module) returns the module namespace, so destructure the named export: `const { Yace } = require("yace")`. The same holds for every subpath — `const { tab } = require("yace/plugins/tab")`.
- TypeScript consumers compiling to CommonJS need `"module": "nodenext"` (which implies the matching `moduleResolution`, TypeScript 5.8+); the older `node16` setting rejects `require` of an ESM package.
- Jest's default CommonJS runtime cannot load ESM — use Vitest or Jest's ESM mode.
- Styling highlighter tokens `bold` or `italic` is safe while the editor font is strictly monospace: every face shares one advance width, so glyphs change stroke shape but not position (verified — Menlo, Monaco, Courier New render identical line widths in 400/700/italic). The trap is a proportional font or a font-stack fallback to one: there a bold run is wider, every glyph after it shifts, and the caret lands off the letters. When unsure, keep token classes at `font-weight`/`font-style` normal.

## License

[MIT](/LICENSE)
