# Y A C E [![npm](https://badgen.net/npm/v/yace/?color=gray&cache=300)](https://www.npmjs.com/package/yace)

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
- `lineNumber` — show or hide line numbers, default `false`.
- `highlighter` — function that takes current value and return highlighted html.
- `styles` — styles for root component, e.g. `{ fontSize: "20px }`.
- `plugins` — array of plugins.

### Plugin

Plugin is a function that called with textarea params `{value, selectionStart, selectionEnd}` as first argument and keydown DOM event as second argument and returns new textarea params `{value, selectionStart, selectionEnd}`.

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

### `destroy()`

Remove all listeners.

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
