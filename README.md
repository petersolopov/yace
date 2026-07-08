# Y A C E

[![build](https://github.com/petersolopov/yace/workflows/build/badge.svg)](https://github.com/petersolopov/yace/actions?query=workflow%3Abuild) [![npm](https://badgen.net/npm/v/yace/?cache=300)](https://www.npmjs.com/package/yace) [![Coverage Status](https://coveralls.io/repos/github/petersolopov/yace/badge.svg)](https://coveralls.io/github/petersolopov/yace) [![bundlephobia](https://badgen.net/bundlephobia/minzip/yace?label=size)](https://bundlephobia.com/result?p=yace)

Yet another code editor — tiny, framework-agnostic, yours to extend.

- ~1.7KB gzipped, zero dependencies.
- A real `<textarea>` underneath — native caret, IME, mobile input, and accessibility come for free.
- Bring any highlighter — PrismJS, highlight.js — or chain several as a pipeline.
- Add behavior with plugins — tab, undo/redo, auto-indent — or write your own in a few lines.
- Framework-agnostic: hand it a DOM node and it drops into React or anything else.

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

Live demos on CodeSandbox:

- [Using highlight.js as highlighter](https://codesandbox.io/s/yace-highlightjs-jvqp0)
- [Using PrismJS as highlighter](https://codesandbox.io/s/yace-prismjs-gnjty)
- [Building a tiny ~2KB markdown editor](https://codesandbox.io/s/yace-mdhl-ftdr4)
- [Markdown editor with highlighted code blocks](https://codesandbox.io/s/yace-mdhl-highlightjs-xocgf)
- [Using plugins](https://codesandbox.io/s/yace-plugins-m3uzv)
- [Using with React](https://codesandbox.io/s/yace-react-4cwly)

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

For your own shortcut checks, `yace/plugins/isKey` matches a shortcut against a `KeyboardEvent` — `isKey("ctrl/cmd+z", event)` — with ctrl/cmd normalization and a physical-code fallback that survives non-Latin layouts.

## Highlighting

A highlighter is a function `(value) => html`. yace assigns the returned HTML to `innerHTML`, so it must:

- Escape HTML in user text — `&`, `<`, `>`, and quotes inside attributes. Returning raw input is an XSS vector.
- Keep font metrics constant — one monospace font, no bold, no ligatures. Anything that changes glyph widths drifts the highlighted layer out of line with the textarea.

Highlighters run as a pipeline: `highlighters: Highlighter[]`. The full signature is `(value, context?) => html`: the first stage is called with `context.html` false (or absent) and must escape the raw value; each later stage is called with `context.html === true`, receives the previous stage's HTML, and must be HTML-aware — copy tags through, do not re-escape. An empty array falls back to the built-in escaping highlighter. Drop in PrismJS, highlight.js, or the bundled `basic`:

```js
import { Yace } from "yace";
import { basic } from "yace/highlighters/basic";

new Yace("#editor", {
  value: "const answer = 42;",
  highlighters: [basic()],
});
```

Chaining is the point of the pipeline: `[basic(), shimmer({ words: ["TODO"] })]` tokenizes first, then decorates on top. Only the first stage may escape its whole input — a plain tokenizer like `basic()` placed later would double-escape the HTML before it.

**Bundled extras.** yace ships a few optional highlighters as a `yace/highlighters` barrel or one-per-file subpaths (`yace/highlighters/basic`). No separate stylesheet is needed — `basic` emits classes only (bring your own colors), while the decorative highlighters inject their animation CSS at runtime and expose classes plus CSS variables you theme.

- `basic(extraRules?)` — an extensible tokenizer. Emits `<span class="yace-tok yace-tok--type">` per token, no colors of its own. Pass `extraRules` (`{ type, pattern }[]`, tried before the built-ins) to add token types; flags on your patterns (`/i`, `/u`, `/s`) are kept.
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

## License

[MIT](/LICENSE)
