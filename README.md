# Y A C E [![build](https://github.com/petersolopov/yace/workflows/build/badge.svg)](https://github.com/petersolopov/yace/actions?query=workflow%3Abuild) [![npm](https://badgen.net/npm/v/yace/?cache=300)](https://www.npmjs.com/package/yace) [![Coverage Status](https://coveralls.io/repos/github/petersolopov/yace/badge.svg)](https://coveralls.io/github/petersolopov/yace) [![bundlephobia](https://badgen.net/bundlephobia/minzip/yace?label=size)](https://bundlephobia.com/result?p=yace)

yet another code editor

## Features

- ~1KB gzipped with zero dependencies.
- binding hotkey and enhance with plugins.
- adding any highlighter.

## Installation

`yace` is published to npm, and accessible via the unpkg.com CDN:

**via npm:**

```bash
npm i yace
```

**hotlinking from unpkg:** _(no build tool needed!)_

```js
import Yace from "https://unpkg.com/yace?module";
```

## Usage

`yace` is working in browser and need DOM node e.g.:

```html
<div id="editor"></div>
```

Initializing editor passing css selector and options:

```js
import Yace from "yace";

const editor = new Yace("#editor", {
  value: "your awesome code",
  lineNumbers: true,
});
```

## Examples

Live demo with codesandbox:

- [Using `highlight.js` as highlighter](https://codesandbox.io/s/yace-highlightjs-jvqp0)
- [Using `prismjs` as highlighter](https://codesandbox.io/s/yace-prismjs-gnjty)
- [Building tiny ~2KB markdown editor](https://codesandbox.io/s/yace-mdhl-ftdr4)
- [Building markdown editor with highlighting code in code blocks](https://codesandbox.io/s/yace-mdhl-highlightjs-xocgf)
- [Using plugins](https://codesandbox.io/s/yace-plugins-m3uzv)
- [Using with react](https://codesandbox.io/s/yace-react-4cwly)

## API

```js
const editor = new Yace(selector, options);
```

### Options

- `value` — initial value.
- `lineNumbers` — show or hide line numbers, default `false`.
- `highlighter` — function that takes current value and return highlighted html, see [highlighter contract](#highlighter-contract).
- `styles` — styles for root component, e.g. `{ fontSize: "20px" }`.
- `plugins` — array of plugins, see [plugins](#plugins).

### Highlighter contract

The returned HTML is assigned to `innerHTML`, so two rules apply:

- The highlighter must escape HTML in the value (`<`, `>`, `&`, quotes). The default highlighter escapes everything; Prism and highlight.js escape too. Returning unescaped user input from a custom highlighter is an XSS vector.
- The highlighting must not change character widths: keep one monospace font and one font size. If a token style changes glyph widths, the highlighted layer drifts out of alignment with the invisible textarea text.

### Plugins

First-party plugins are available as subpath imports:

```js
import Yace from "yace";
import history from "yace/plugins/history";
import tab from "yace/plugins/tab";
import preserveIndent from "yace/plugins/preserveIndent";
import cutLine from "yace/plugins/cutLine";

const editor = new Yace("#editor", {
  // history goes first: it must checkpoint the state before other plugins change it
  plugins: [history(), tab(), preserveIndent(), cutLine()],
});
```

First-party plugin factories and their options:

- `history({ limit = 300, coalesceMs = 300 })` — undo/redo. `limit` caps the number of stored states; edits made within `coalesceMs` of each other merge into one undo step.
- `tab(tabCharacter = "  ")` — indent and outdent the selection with tab and shift + tab.
- `preserveIndent()` — keep the current line's indentation on enter.
- `cutLine(predicate?)` — cut the selection or current line to the clipboard; `predicate` overrides the default ctrl/cmd + x.

Plugin is a function that is called with textarea params `{value, selectionStart, selectionEnd}` as first argument and the DOM event (`keydown`, `input` or `compositionend`) as second argument. It returns new textarea params or `undefined` to leave them unchanged.

```js
const upperCase = ({ value }) => ({ value: value.toUpperCase() });
```

### `onUpdate(callback)`

It takes a callback that will be invoked when editor value is changed.

```js
editor.onUpdate((value) => console.log(`new value: ${value}`));
```

### `update(params)`

Update editor value and selections.

```js
// update value
editor.update({ value: "new awesome code" });

// update selection
editor.update({ selectionStart: 0, selectionEnd: 4 });
```

### `updateOptions(options)`

Change any constructor options on a live editor — highlighter, plugins, styles, lineNumbers.

```js
editor.updateOptions({
  highlighter: (value) => Prism.highlight(value, Prism.languages.javascript, "javascript"),
});
editor.updateOptions({ lineNumbers: false });
```

### `destroy()`

Remove listeners and created DOM nodes, restore container styles. The instance can not be reused after that — create a new one.

```js
editor.destroy();
```

### `value`

Get the current editor's value.

```js
editor.value; // => "your awesome code";
```

### `textarea`

Get the textarea DOM element.

```js
editor.textarea.focus();
editor.textarea.spellcheck = false;
```

## License

[MIT](/LICENSE)
