# Yace

[![npm](https://badgen.net/npm/v/yace/?cache=300)](https://www.npmjs.com/package/yace) [![Coverage Status](https://coveralls.io/repos/github/petersolopov/yace/badge.svg)](https://coveralls.io/github/petersolopov/yace) [![bundlephobia](https://badgen.net/bundlephobia/minzip/yace?label=size)](https://bundlephobia.com/result?p=yace)

Yace is a tiny, extensible code editor component for cases where a plain
`<textarea>` is not enough and Monaco or CodeMirror would be overkill.

<img width="1688" height="769" alt="280ac357e6610df818a4177b84b5892fd41fa5b56e69428ca597854a0d8c4a55" src="https://github.com/user-attachments/assets/45598a8d-7b5a-4b74-9b9e-2775e51d6345" />


Under 2KB gzipped. Zero dependencies. Framework agnostic.

- Input stays in a real `<textarea>`, preserving native caret behavior, IME,
  mobile input, selection, and accessibility
- Plugins add only the editing behavior you need: history, indentation,
  bracket pairing, shortcuts, or your own transformations
- Highlighters control what appears as you type: code, Markdown, tokens,
  animations, or your own renderer
- The editor mounts into a DOM node and works with React, Vue, vanilla JS, or
  anything else

[See live examples](#examples)

## When Yace fits

Use Yace for embedded code samples, documentation playgrounds, Markdown
inputs, prompt editors, token visualizers, and custom text experiences. It
gives you syntax highlighting and editing hooks without bringing an IDE into
the page.

If you need large-document virtualization, multicursor editing, rich text, or
a full language-tooling platform, use Monaco or CodeMirror. Yace deliberately
stays smaller and gives you the pieces to build the editor you actually need.

## Quick start

Install Yace from npm:

```bash
npm install yace
```

Add a mount point:

```html
<div id="editor"></div>
```

Create an editor with syntax highlighting and familiar editing behavior:

```js
import { Yace } from "yace";
import { code } from "yace/highlighters/code";
import { history, preserveIndent, tab } from "yace/plugins";

const editor = new Yace("#editor", {
  value: "const answer = 42;",
  lineNumbers: true,
  highlighters: [code()],
  plugins: [history(), tab(), preserveIndent()],
});

editor.onUpdate((value) => console.log(value));
```

> Keep `history()` first: it checkpoints the textarea state before later plugins
transform it.

Yace is ESM-only. You can also load the core directly from a CDN without a
build step:

```js
import { Yace } from "https://unpkg.com/yace?module";
```

## How it works

A transparent `<textarea>` sits over a highlighted `<pre>`. The textarea owns
input, caret, selection, IME, and accessibility. The `<pre>` paints the same
text underneath it.

The overlay pattern is established. Yace keeps the implementation small and
turns the two extension points into explicit pipelines:

- Plugins receive the textarea state and an input event, then return the next
  text and selection
- Highlighters receive the current value and return the HTML rendered by the
  `<pre>`; chain them to tokenize first and decorate the result afterward

The core ships no required highlighter or editing behavior. Start with the
native textarea and add only what the editor needs.

## Examples

Start with the editor itself:

- [Getting started with the bundled code highlighter](https://codepen.io/petersolopov/pen/JoELdOr)
- [Use highlight.js as the highlighter](https://codepen.io/petersolopov/pen/dPNddwg)
- [Use PrismJS as the highlighter](https://codepen.io/petersolopov/pen/RNKQMaX)
- [Add undo, tab, indentation, and cut-line plugins](https://codepen.io/petersolopov/pen/GgrQxjg)
- [Use Yace with React](https://codepen.io/petersolopov/pen/XJpZEKq)
- [Build a Markdown editor](https://codepen.io/petersolopov/pen/NPdyYrR)

Push the same pipelines further:

- [Write a plugin](https://codepen.io/petersolopov/pen/OPWvyOM)
- [Write a highlighter in about 15 lines](https://codepen.io/petersolopov/pen/dPNmYWr)
- [Highlight Markdown and fenced code blocks](https://codepen.io/petersolopov/pen/pvRaLbw)
- [Visualize LLM tokens in an editable OpenAI-style view](https://codepen.io/petersolopov/pen/emgMpMr)
- [Layer shimmer and glitch effects over selected words](https://codepen.io/petersolopov/pen/Qwdmjxg)

## Constructor options

`new Yace(target, options)` takes a CSS selector or DOM `Node`. Every option is
optional:

```js
new Yace(target, {
  value: "",           // sets the initial text
  highlighters: [],    // defines the rendering pipeline
  plugins: [],         // defines the editing pipeline, reduced from left to right
  lineNumbers: false,  // adds a line-number gutter
  styles: {},          // applies inline styles to the editor root, such as `{ fontSize: "20px" }`
});
```

## Instance API

The DOM yace built, and the methods to drive it:

- `editor.value` holds the current text
- `editor.textarea` exposes the real `<textarea>` for focus, `readOnly`,
  `spellcheck`, and other native features
- `editor.root` exposes the mount element
- `editor.pre` exposes the highlighted `<pre>` layer
- `editor.onUpdate((value: string) => void)` registers a callback for edits
- `editor.update({ value?, selectionStart?, selectionEnd? })` updates the text
  or selection; a value-only update preserves the current selection
- `editor.updateOptions({ value?, lineNumbers?, highlighters?, plugins?, styles? })`
  changes constructor options on a live editor
- `editor.destroy()` removes listeners and nodes and restores the container;
  later `update()` calls are silent no-ops

## Plugins

A plugin receives the textarea state and DOM event, then returns the next state
or nothing:

```ts
type Plugin = (
  props: TextareaProps,
  event: Event,
) => Partial<TextareaProps> | void;

interface TextareaProps {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}
```

Yace runs plugins from left to right on `keydown`, `input`, and
`compositionend`. Each plugin sees the previous plugin's result.

```js
import { Yace } from "yace";

const upperCase = ({ value }) => ({ value: value.toUpperCase() });

new Yace("#editor", { plugins: [upperCase] });
```

First-party plugins are available from `yace/plugins` or individual subpaths
such as `yace/plugins/tab`:

- `history({ limit = 300, coalesceMs = 300 })` adds undo and redo, caps stored
  states with `limit`, and merges nearby edits using `coalesceMs`; it must be
  first in the pipeline
- `tab(tabCharacter = "  ")` indents or outdents the selection with Tab and
  Shift+Tab
- `preserveIndent()` carries the current line's indentation to the next line
- `cutLine(predicate?)` cuts the selection or current line on Ctrl/Cmd+X;
  `predicate` can override the trigger
- `autoClose(pairs?)` inserts matching brackets, wraps selections, steps over
  existing closing characters, and removes empty pairs together
- `toggleComment(prefix = "// ", predicate?)` toggles line comments on the
  current line or selection; blank lines are skipped
- `isKey(shortcut, event)` matches shortcuts with Ctrl/Cmd normalization and a
  physical-code fallback for non-Latin keyboard layouts

## Highlighting

A highlighter turns text into HTML. Yace assigns the result to `innerHTML`, so
the first highlighter must escape user text. Returning raw input is an XSS
vector.

```ts
type Highlighter = (value: string, context?: { html: boolean }) => string;
```

Highlighters run as a pipeline. The first stage receives raw text with
`context.html === false`. Later stages receive the previous stage's HTML with
`context.html === true`, so they must preserve tags instead of escaping the
whole input again. An empty pipeline falls back to Yace's escaping highlighter.

```js
import { Yace } from "yace";
import { code } from "yace/highlighters/code";
import { shimmer } from "yace/highlighters/shimmer";

new Yace("#editor", {
  highlighters: [code(), shimmer({ words: ["TODO"] })],
});
```

Highlighters must keep glyph advance widths constant or the painted text will
drift away from the native caret. Bold and italic are safe when every face in
the font stack is strictly monospace.

First-party highlighters are available from `yace/highlighters` or individual
subpaths such as `yace/highlighters/code`:

- `code(extraRules?)` is an extensible tokenizer that emits `yace-tok` classes
  without imposing colors; custom rules run before built-ins
- `markdown()` highlights Markdown with the vendored
  [mdhl](https://github.com/petersolopov/mdhl) and emits `mdhl-*` classes;
  place it first or use it alone
- `sliceGlitch(options?)` splits lines into displaced RGB slices and exposes
  `--yace-slice-a` and `--yace-slice-b` for theming
- `shimmer(options?)` sweeps a light band over text and exposes
  `--yace-shimmer-base` and `--yace-shimmer-band` for theming

`sliceGlitch` and `shimmer` also accept a `words` array to decorate only
matching words. They inject their animation CSS at runtime; `code` and
`markdown` emit classes only, so the consumer supplies token colors.

## Browser support

Yace supports evergreen Chromium, Firefox, WebKit, and current mobile
browsers. It is client-only and needs the DOM. IE and SSR are not supported.

## Non-goals

Large documents, multicursor editing, rich text, decorations, and SSR are out
of scope by design. They need a document model rather than a textarea overlay.

## Gotchas

- With a bundler, `yace/plugins` and `yace/highlighters` tree-shake normally;
  with native browser modules, prefer exact paths such as `yace/plugins/tab`
  to avoid fetching every sibling
- `require("yace")` on Node 22+ returns the ESM module namespace, so use
  `const { Yace } = require("yace")`; the same applies to every subpath
- TypeScript consumers compiling to CommonJS need `"module": "nodenext"` and
  TypeScript 5.8 or newer; `node16` rejects `require` of an ESM package
- Jest's default CommonJS runtime cannot load ESM; use Vitest or Jest's ESM
  mode
- Token styles may use bold or italic only when the complete font stack is
  strictly monospace; proportional fallback faces shift the painted layer away
  from the caret

## Development

Install dependencies and start the landing page on `http://localhost:5714`:

```bash
npm install
npm run dev
```

Verify the library before submitting a change:

```bash
npm test
npm run typecheck
npm run prettier:check
npm run test:e2e
npm run attw
```

## License

[MIT](/LICENSE)
