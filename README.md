<p align="center" >
  <img src="https://image.flaticon.com/icons/svg/876/876020.svg" alt="" width="180" />
</p>
<p align="center">
  Yet Another Code Editor
</p>
<br><br>

[![build](https://github.com/petersolopov/yace/workflows/build/badge.svg)](https://github.com/petersolopov/yace/actions) [![npm version](https://badgen.net/npm/v/yace)](https://www.npmjs.com/package/yace)

## Features

- pretty small, [~1KB gzipped](https://bundlephobia.com/result?p=yace) with zero dependencies.
- adding any highlighter, hotkey, or whatever you want via plugins.
- working with any framework

## Installation

via [npm](https://www.npmjs.com/package/yace):

```bash
npm i yace
```

hotlinking from unpkg:

```js
import Yace from "https://unpkg.com/yace?module";
```

## Usage

```js
import Yace from "yace";

const editor = new Yace("#editor", {
  value: "your awesome code",
  lineNumbers: true,
});
```

## Examples

- [Using `highlight.js` as highlighter](https://codesandbox.io/s/yace-highlightjs-jvqp0)
- [Using `prismjs` as highlighter](https://codesandbox.io/s/yace-prismjs-gnjty)
- [Building tiny ~3KB markdown editor](https://codesandbox.io/s/yace-mdhl-ftdr4)
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

## Thanks

Icon made by [kiranshastry](https://www.flaticon.com/authors/kiranshastry) from [www.flaticon.com](https://www.flaticon.com/)
