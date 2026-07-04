import { test } from "node:test";
import assert from "node:assert";
import "undom/register.js";

import Yace from "../src/index.js";
import preserveIndent from "../src/plugins/preserveIndent.js";
import isKey from "../src/plugins/isKey.js";
import tab from "../src/plugins/tab.js";
import cutLine from "../src/plugins/cutLine.js";
import history from "../src/plugins/history.js";

// mock querySelector for yace and return mocked editor element
document.querySelector = () => document.createElement("div");

// helpers
function dispatchTextareaEvent(textarea, value, type = "input") {
  textarea.value = value;
  textarea.dispatchEvent({ type });
}

function pressEnter(editor, value, selectionStart, selectionEnd = selectionStart) {
  editor.textarea.value = value;
  editor.textarea.selectionStart = selectionStart;
  editor.textarea.selectionEnd = selectionEnd;
  editor.textarea.dispatchEvent({ type: "keydown", which: 13, preventDefault() {} });
}

test("constructor", () => {
  const editor = new Yace("#editor");

  assert.throws(() => new Yace(), "constructor should throw error when called without arguments");
  assert.ok(editor instanceof Yace, "constructor should return editor instance");

  document.querySelector = () => null;
  assert.throws(() => new Yace("#editor"), "it should throw error when dom element is not found");
  // restore mock
  document.querySelector = () => document.createElement("div");
});

test("custom container", () => {
  const container = document.createElement("div");
  const editor = new Yace(container);

  assert.ok(editor instanceof Yace, "constructor should return editor instance");
  assert.deepStrictEqual(editor.root, container, "the passed node should be used as the root");
});

test("instance", () => {
  const editor = new Yace("#editor", { value: "test" });

  assert.deepStrictEqual(editor.value, "test", "instance should contain value");
  assert.deepStrictEqual(typeof editor.onUpdate, "function", "instance should contain onUpdate method");
  assert.deepStrictEqual(typeof editor.update, "function", "instance should contain update method");
  assert.deepStrictEqual(typeof editor.destroy, "function", "instance should contain destroy method");
  assert.deepStrictEqual(typeof editor.textarea, "object", "instance should contain textarea property");
});

test("textarea", () => {
  const editor = new Yace("#editor", { value: "test" });
  assert.ok(editor.textarea.style, "textarea should have a style object");
  assert.deepStrictEqual(editor.textarea.value, "test", "textarea should have value same in option");
});

test("pre", () => {
  const editor = new Yace("#editor", { value: "test" });
  assert.ok(editor.pre, "pre should exist");
  assert.deepStrictEqual(editor.pre.nodeName, "PRE", "pre element should have nodeName PRE");
  assert.ok(editor.pre.style, "pre should have a style object");
  assert.deepStrictEqual(editor.pre.innerHTML, "test<br/>", "pre should have initial html");

  dispatchTextareaEvent(editor.textarea, "new value");
  assert.deepStrictEqual(editor.pre.innerHTML, "new value<br/>", "pre should update after textarea was changed");
});

test(".onUpdate()", () => {
  const editor = new Yace("#editor");

  let calledTimes = 0;
  let value = null;
  editor.onUpdate((newValue) => {
    calledTimes++;
    value = newValue;
  });

  assert.deepStrictEqual(calledTimes, 0, "callback should not be called during initialization");

  dispatchTextareaEvent(editor.textarea, "new value");

  assert.deepStrictEqual(calledTimes, 1, "callback should be called when input event was happened");
  assert.deepStrictEqual(value, "new value", "callback should be called with new value");
});

test(".onUpdate() fires only on real value changes", () => {
  const editor = new Yace("#editor", { value: "abc" });

  const calls = [];
  editor.onUpdate((value) => calls.push(value));

  editor.update({ selectionStart: 1, selectionEnd: 2 });
  assert.deepStrictEqual(calls.length, 0, "a selection-only update should not fire onUpdate");

  editor.update({ value: "abc" });
  assert.deepStrictEqual(calls.length, 0, "setting the same value should not fire onUpdate");

  editor.update({ value: "abcd" });
  assert.deepStrictEqual(calls, ["abcd"], "a real value change fires once with the new value");
});

test(".onUpdate() reports the post-plugin value", () => {
  const upperCasePlugin = ({ value }) => ({ value: value.toUpperCase() });
  const editor = new Yace("#editor", { plugins: [upperCasePlugin] });

  let received = null;
  editor.onUpdate((value) => (received = value));
  dispatchTextareaEvent(editor.textarea, "xyz");

  assert.deepStrictEqual(received, "XYZ", "onUpdate should receive the value after plugins run");
});

test(".update()", () => {
  const editor = new Yace("#editor");

  // update only value
  editor.update({ value: "updated value" });
  assert.deepStrictEqual(editor.textarea.value, "updated value", "textarea value should be updated");
  assert.deepStrictEqual(editor.pre.innerHTML, "updated value<br/>", "pre html should be updated");

  // update only selections
  editor.update({ selectionStart: 1, selectionEnd: 2 });
  assert.deepStrictEqual(editor.textarea.value, "updated value", "textarea value should be same");
  assert.deepStrictEqual(editor.pre.innerHTML, "updated value<br/>", "pre value should be same");
  assert.deepStrictEqual(editor.textarea.selectionStart, 1, "selectionStart should be updated");
  assert.deepStrictEqual(editor.textarea.selectionEnd, 2, "selectionEnd should be updated");

  // update value and selection
  editor.update({
    value: "new updated value",
    selectionStart: 3,
    selectionEnd: 4,
  });
  assert.deepStrictEqual(editor.textarea.value, "new updated value", "textarea value should be updated");
  assert.deepStrictEqual(editor.pre.innerHTML, "new updated value<br/>", "pre value should be updated");
  assert.deepStrictEqual(editor.textarea.selectionStart, 3, "selectionStart should be updated");
  assert.deepStrictEqual(editor.textarea.selectionEnd, 4, "selectionEnd should be updated");
});

test(".update() keeps selection when only value changes", () => {
  const editor = new Yace("#editor", { value: "hello world" });

  editor.update({ selectionStart: 3, selectionEnd: 5 });
  editor.update({ value: "hello there" });

  assert.deepStrictEqual(editor.textarea.value, "hello there", "value should be updated");
  assert.deepStrictEqual(editor.textarea.selectionStart, 3, "selectionStart should be unchanged");
  assert.deepStrictEqual(editor.textarea.selectionEnd, 5, "selectionEnd should be unchanged");
});

test("value normalization", () => {
  const editorZero = new Yace("#editor", { value: 0 });
  assert.deepStrictEqual(editorZero.textarea.value, "0", "constructor value 0 should render as '0'");
  assert.deepStrictEqual(editorZero.pre.innerHTML, "0<br/>", "pre should render '0' for numeric constructor value");

  const editorUndefined = new Yace("#editor", { value: undefined });
  assert.deepStrictEqual(editorUndefined.textarea.value, "", "constructor value undefined should become empty string");

  const editor = new Yace("#editor");
  editor.update({ value: 0 });
  assert.deepStrictEqual(editor.textarea.value, "0", "update value 0 should render '0'");
  assert.deepStrictEqual(editor.pre.innerHTML, "0<br/>", "pre should render '0'");
});

test(".updateOptions() replaces the highlighter and re-renders", () => {
  const editor = new Yace("#editor", { value: "abc" });

  editor.updateOptions({ highlighter: (value) => value.toUpperCase() });

  assert.deepStrictEqual(editor.pre.innerHTML, "ABC<br/>", "new highlighter should re-render the current value");
  assert.deepStrictEqual(editor.textarea.value, "abc", "textarea value should be untouched");
});

test(".updateOptions() replaces the plugins", () => {
  const editor = new Yace("#editor", { value: "abc" });

  const upperCasePlugin = ({ value }) => ({ value: value.toUpperCase() });
  editor.updateOptions({ plugins: [upperCasePlugin] });
  dispatchTextareaEvent(editor.textarea, "next");

  assert.deepStrictEqual(editor.textarea.value, "NEXT", "new plugins should take effect on the next event");
});

test(".updateOptions() routes value through update() and fires onUpdate", () => {
  const editor = new Yace("#editor", { value: "abc" });

  let updated = null;
  editor.onUpdate((value) => (updated = value));
  editor.updateOptions({ value: "fresh" });

  assert.deepStrictEqual(editor.textarea.value, "fresh", "value should route through update()");
  assert.deepStrictEqual(updated, "fresh", "onUpdate should fire for a value change");
});

test(".updateOptions() toggles line numbers", () => {
  const root = document.createElement("div");
  const editor = new Yace(root, { value: "1\n2\n3" });

  assert.deepStrictEqual(root.childNodes.length, 2, "no lines element without lineNumbers");

  editor.updateOptions({ lineNumbers: true });
  assert.deepStrictEqual(root.childNodes.length, 3, "lines element should be created");
  assert.deepStrictEqual(root.style.paddingLeft, "2ch", "padding should be applied");

  editor.updateOptions({ lineNumbers: false });
  assert.deepStrictEqual(root.childNodes.length, 2, "lines element should be removed");
  assert.deepStrictEqual(root.style.paddingLeft, "", "padding should be reverted");
});

test(".updateOptions() keeps user padding when line numbers turn off", () => {
  const root = document.createElement("div");
  const editor = new Yace(root, {
    value: "1\n2\n3",
    lineNumbers: true,
    styles: { paddingLeft: "10px" },
  });

  assert.deepStrictEqual(root.style.paddingLeft, "2ch", "line numbers should own the padding");

  editor.updateOptions({ lineNumbers: false });
  assert.deepStrictEqual(root.style.paddingLeft, "10px", "user padding should come back, not the pre-editor value");

  editor.updateOptions({ lineNumbers: true });
  editor.updateOptions({ styles: { paddingLeft: "24px" }, lineNumbers: false });
  assert.deepStrictEqual(root.style.paddingLeft, "24px", "a padding set via updateOptions should become the new base");

  editor.destroy();
  assert.deepStrictEqual(root.style.paddingLeft, "", "destroy still restores the pre-editor value");
});

test(".updateOptions() padding shorthand refreshes the base", () => {
  const root = document.createElement("div");
  const editor = new Yace(root, { value: "1\n2\n3" });

  editor.updateOptions({ styles: { padding: "5px" } });
  // "" in undom (no shorthand expansion), "5px" in real browsers — the
  // contract is "base equals paddingLeft at shorthand time", not a literal
  const base = root.style.paddingLeft || "";

  editor.updateOptions({ lineNumbers: true });
  assert.deepStrictEqual(root.style.paddingLeft, "2ch", "line numbers own the padding");

  editor.updateOptions({ lineNumbers: false });
  assert.deepStrictEqual(root.style.paddingLeft, base, "the base captured at shorthand time should come back");
});

test(".updateOptions() styles stay restorable by destroy", () => {
  const root = document.createElement("div");
  root.style.color = "red";
  const editor = new Yace(root, { styles: { fontSize: "20px" } });

  editor.updateOptions({ styles: { color: "blue", background: "black" } });
  assert.deepStrictEqual(root.style.color, "blue", "new style should be applied");

  editor.destroy();
  assert.deepStrictEqual(root.style.color, "red", "pre-existing inline style should be restored");
  assert.deepStrictEqual(root.style.background, "", "added style should be removed");
  assert.deepStrictEqual(root.style.fontSize, "", "constructor style should be removed");
});

test(".updateOptions() after destroy is a no-op", () => {
  const editor = new Yace("#editor");
  editor.destroy();

  assert.doesNotThrow(() => editor.updateOptions({ lineNumbers: true }), "updateOptions should not throw");
});

test(".destroy()", () => {
  const editor = new Yace("#editor");
  const { textarea, root } = editor;
  editor.destroy();

  assert.ok(!textarea.__handlers.input.length, "input handler should be destroyed");
  assert.ok(!textarea.__handlers.keydown.length, "keydown handler should be destroyed");
  assert.ok(!textarea.__handlers.compositionend.length, "compositionend handler should be destroyed");
  assert.deepStrictEqual(root.childNodes.length, 0, "created nodes should be removed");
  assert.deepStrictEqual(editor.textarea, null, "textarea reference should be cleared");
  assert.deepStrictEqual(editor.pre, null, "pre reference should be cleared");
  assert.doesNotThrow(() => editor.destroy(), "double destroy should be a no-op");
});

test(".destroy() restores container styles", () => {
  const root = document.createElement("div");
  root.style.fontSize = "12px";

  const editor = new Yace(root, {
    value: "1\n2\n3",
    lineNumbers: true,
    styles: { fontSize: "200px" },
  });

  assert.deepStrictEqual(root.style.fontSize, "200px", "init should apply option styles");
  assert.deepStrictEqual(root.style.paddingLeft, "2ch", "line numbers should set padding");
  assert.deepStrictEqual(root.childNodes.length, 3, "editor should create three nodes");

  editor.destroy();

  assert.deepStrictEqual(root.style.fontSize, "12px", "prior inline style should be restored");
  assert.deepStrictEqual(root.style.paddingLeft, "", "padding mutation should be reverted");
  assert.deepStrictEqual(root.style.position, "", "root styles should be reverted");
  assert.deepStrictEqual(root.childNodes.length, 0, "lines node should be removed too");
});

test(".destroy() survives externally detached nodes", () => {
  const root = document.createElement("div");
  const editor = new Yace(root, { styles: { fontSize: "200px" } });

  root.removeChild(editor.textarea);
  root.removeChild(editor.pre);

  assert.doesNotThrow(() => editor.destroy(), "destroy should not throw");
  assert.deepStrictEqual(root.style.fontSize, "", "styles should still be restored");
  assert.deepStrictEqual(editor.textarea, null, "references should still be cleared");
});

test(".update() after destroy is a no-op", () => {
  const editor = new Yace("#editor");
  editor.destroy();

  assert.doesNotThrow(() => editor.update({ value: "late" }), "update should not throw");
});

test("re-init on the same node after destroy", () => {
  const root = document.createElement("div");

  const first = new Yace(root, { value: "one" });
  first.destroy();
  const second = new Yace(root, { value: "two" });

  assert.deepStrictEqual(root.childNodes.length, 2, "only one set of nodes should exist");
  assert.deepStrictEqual(second.textarea.value, "two", "new editor should work after destroy");
});

test("IME composition guard", () => {
  const editor = new Yace("#editor");

  let calledTimes = 0;
  editor.onUpdate(() => {
    calledTimes++;
  });

  editor.textarea.value = "ni";
  editor.textarea.dispatchEvent({ type: "input", isComposing: true });
  assert.deepStrictEqual(calledTimes, 0, "input during composition should not re-render");
  assert.deepStrictEqual(editor.pre.innerHTML, "<br/>", "pre should stay empty during composition");

  editor.textarea.dispatchEvent({ type: "keydown", keyCode: 229 });
  assert.deepStrictEqual(calledTimes, 0, "keydown with keyCode 229 should not re-render");

  editor.textarea.value = "你好";
  editor.textarea.dispatchEvent({ type: "compositionend" });
  assert.deepStrictEqual(calledTimes, 1, "compositionend should re-render once");
  assert.deepStrictEqual(editor.textarea.value, "你好", "textarea should keep the committed value");
  assert.deepStrictEqual(editor.pre.innerHTML, "你好<br/>", "pre should render the committed value");

  const upperCasePlugin = ({ value }) => ({ value: value.toUpperCase() });
  const pluginEditor = new Yace("#editor", { plugins: [upperCasePlugin] });
  pluginEditor.textarea.value = "abc";
  pluginEditor.textarea.dispatchEvent({ type: "compositionend" });
  assert.deepStrictEqual(pluginEditor.textarea.value, "ABC", "compositionend should run the plugin pipeline");
});

test("options.lineNumber", () => {
  const editor = new Yace("#editor", { lineNumbers: true });

  const lineNumbersElement = editor.root.childNodes[2];

  assert.ok(lineNumbersElement, "line numbers element should exist");
  assert.ok(lineNumbersElement.innerHTML, "line numbers html should exist");
  assert.deepStrictEqual(
    lineNumbersElement.innerHTML.split("\n").length,
    1,
    "a single-line value should render one line number",
  );
  assert.deepStrictEqual(editor.root.style.paddingLeft, "2ch", "root element should have 2ch padding left");

  editor.update({ value: "1\n2\n3\n4" });
  assert.deepStrictEqual(lineNumbersElement.innerHTML.split("\n").length, 4, "it should be 4 line number after update");
  assert.deepStrictEqual(editor.root.style.paddingLeft, "2ch", "root element should have 2ch padding left");

  editor.update({ value: "1\n2\n3\n4\n5\n6\n7\n8\n9\n10" });
  assert.deepStrictEqual(
    lineNumbersElement.innerHTML.split("\n").length,
    10,
    "it should be 10 line numbers after update",
  );
  assert.deepStrictEqual(editor.root.style.paddingLeft, "3ch", "root element should have 3ch padding left");
});

test("options.highlighter", () => {
  const editor = new Yace("#editor", {
    value: "test",
    highlighter: (value) => value.toUpperCase(),
  });

  assert.deepStrictEqual(editor.pre.innerHTML, "TEST<br/>", "it should transform pre innerHTML when editor init");
  assert.deepStrictEqual(editor.textarea.value, "test", "textarea should have initial value");

  editor.update({ value: "test test" });
  assert.deepStrictEqual(
    editor.pre.innerHTML,
    "TEST TEST<br/>",
    "it should transform pre innerHTML when editor was updated",
  );
  assert.deepStrictEqual(editor.textarea.value, "test test", "textarea should have not transformed value");
});

test("default highlighter escapes HTML entities", () => {
  const editor = new Yace("#editor", { value: "& < > \" '" });

  assert.deepStrictEqual(
    editor.pre.innerHTML,
    "&amp; &lt; &gt; &quot; &#039;<br/>",
    "pre should escape all five HTML entities",
  );

  const withLines = new Yace("#editor", {
    value: "& < > \" '",
    lineNumbers: true,
  });

  assert.ok(
    withLines.lines.innerHTML.includes("&amp; &lt; &gt; &quot; &#039;"),
    "the line-number layer should escape entities too",
  );
});

test("options.styles", () => {
  const editor = new Yace("#editor", {
    styles: { fontSize: "200px", myAwesomeStyle: "foo" },
  });

  assert.deepStrictEqual(editor.root.style.fontSize, "200px", "it should update fontSize style");
  assert.deepStrictEqual(editor.root.style.myAwesomeStyle, "foo", "it should add custom style");
});

test("options.plugins", () => {
  const upperCasePlugin = ({ value }) => ({ value: value.toUpperCase() });

  const editor = new Yace("#editor", {
    plugins: [upperCasePlugin],
  });

  dispatchTextareaEvent(editor.textarea, "new value", "input");
  assert.deepStrictEqual(editor.textarea.value, "NEW VALUE", "it should transform textarea value when input event");
  assert.deepStrictEqual(editor.pre.innerHTML, "NEW VALUE<br/>", "it should transform pre html value when input event");

  dispatchTextareaEvent(editor.textarea, "new value", "keydown");
  assert.deepStrictEqual(editor.textarea.value, "NEW VALUE", "it should transform textarea value when keydown event");
  assert.deepStrictEqual(
    editor.pre.innerHTML,
    "NEW VALUE<br/>",
    "it should transform textarea value when keydown event",
  );
});

test("plugins pipeline: each plugin receives the previous one's output", () => {
  const editor = new Yace("#editor");

  let captured = null;
  const upper = ({ value }) => ({ value: value.toUpperCase() });
  const capture = (props) => {
    captured = props;
  };
  editor.updateOptions({ plugins: [upper, capture] });
  dispatchTextareaEvent(editor.textarea, "abc");

  assert.deepStrictEqual(captured.value, "ABC", "the second plugin receives the transformed value");
  assert.deepStrictEqual(editor.textarea.value, "ABC", "a plugin returning undefined is a passthrough");
});

test("plugins pipeline: partial results from different plugins merge", () => {
  const editor = new Yace("#editor");

  const setValue = () => ({ value: "merged" });
  const setStart = () => ({ selectionStart: 3 });
  editor.updateOptions({ plugins: [setValue, setStart] });
  dispatchTextareaEvent(editor.textarea, "x");

  assert.deepStrictEqual(editor.textarea.value, "merged", "value from the first plugin applies");
  assert.deepStrictEqual(editor.textarea.selectionStart, 3, "selectionStart from the second plugin applies");
});

test("plugins/isKey", () => {
  assert.ok(isKey("enter", { which: 13 }), "matches a plain key by code");
  assert.ok(!isKey("enter", { which: 65 }), "does not match a different key");
  assert.ok(isKey("a", { which: 65 }), "matches a letter via toKeyCode fallback");
  assert.ok(isKey("ctrl/cmd+z", { which: 90, ctrlKey: true }), "matches a modifier combo");
  assert.ok(!isKey("ctrl/cmd+z", { which: 90 }), "does not match when the required modifier is absent");
  assert.ok(isKey("shift", { shiftKey: true }), "matches a modifier-only combo");
});

test("plugins/isKey: edge cases", () => {
  assert.ok(!isKey("enter", { which: 13, shiftKey: true }), "an unexpected modifier rejects an otherwise matching key");
  assert.ok(isKey("escape", { which: 27 }), "matches escape by code");
});

const tabKey = () => {
  const event = {
    type: "keydown",
    which: 9,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  return event;
};
const shiftTabKey = () => {
  const event = {
    type: "keydown",
    which: 9,
    shiftKey: true,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  return event;
};
const enterKey = () => {
  const event = {
    type: "keydown",
    which: 13,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  return event;
};

test("plugins/tab: indent", () => {
  const plugin = tab();

  assert.deepStrictEqual(
    plugin({ value: "ab", selectionStart: 1, selectionEnd: 1 }, tabKey()),
    { value: "a  b", selectionStart: 3, selectionEnd: 3 },
    "collapsed caret should insert the tab character",
  );

  assert.deepStrictEqual(
    plugin({ value: "a\nb", selectionStart: 0, selectionEnd: 3 }, tabKey()),
    { value: "  a\n  b", selectionStart: 2, selectionEnd: 7 },
    "selection through both lines should indent both",
  );

  assert.deepStrictEqual(
    plugin({ value: "a\nb", selectionStart: 0, selectionEnd: 2 }, tabKey()),
    { value: "  a\nb", selectionStart: 2, selectionEnd: 4 },
    "selection ending at column 0 should not indent the next line",
  );

  assert.deepStrictEqual(
    plugin({ value: "ab", selectionStart: 1, selectionEnd: 1 }, { type: "input", which: 9 }),
    undefined,
    "non-keydown event should be a no-op",
  );

  assert.deepStrictEqual(
    plugin({ value: "ab", selectionStart: 1, selectionEnd: 1 }, { type: "keydown", which: 65, preventDefault() {} }),
    undefined,
    "non-tab key should be a no-op",
  );

  assert.deepStrictEqual(
    tab("\t")({ value: "ab", selectionStart: 1, selectionEnd: 1 }, tabKey()),
    { value: "a\tb", selectionStart: 2, selectionEnd: 2 },
    "custom tab character should be supported",
  );
});

test("plugins/tab: outdent", () => {
  const plugin = tab();

  assert.deepStrictEqual(
    plugin({ value: "  a\n  b", selectionStart: 2, selectionEnd: 6 }, shiftTabKey()),
    { value: "a\nb", selectionStart: 0, selectionEnd: 2 },
    "selection through both lines should outdent both",
  );

  assert.deepStrictEqual(
    plugin({ value: "  a\n  b", selectionStart: 0, selectionEnd: 4 }, shiftTabKey()),
    { value: "a\n  b", selectionStart: 0, selectionEnd: 2 },
    "selection ending at column 0 should not outdent the next line",
  );

  assert.deepStrictEqual(
    plugin({ value: "a\nb", selectionStart: 0, selectionEnd: 3 }, shiftTabKey()),
    undefined,
    "nothing to outdent should be a no-op",
  );

  assert.deepStrictEqual(
    plugin({ value: "  ab", selectionStart: 4, selectionEnd: 4 }, shiftTabKey()),
    { value: "ab", selectionStart: 2, selectionEnd: 2 },
    "collapsed caret should outdent the current line",
  );

  assert.deepStrictEqual(
    plugin({ value: "  ab", selectionStart: 0, selectionEnd: 0 }, shiftTabKey()),
    { value: "ab", selectionStart: 0, selectionEnd: 0 },
    "caret at column 0 should stay at column 0, not go negative",
  );

  assert.deepStrictEqual(
    plugin({ value: "  ab", selectionStart: 1, selectionEnd: 1 }, shiftTabKey()),
    { value: "ab", selectionStart: 0, selectionEnd: 0 },
    "caret inside the removed indent should clamp to column 0",
  );

  assert.deepStrictEqual(
    plugin({ value: "a\n  b", selectionStart: 0, selectionEnd: 3 }, shiftTabKey()),
    { value: "a\nb", selectionStart: 0, selectionEnd: 2 },
    "selection ending inside the removed indent should clamp to the line start",
  );
});

function mockClipboard() {
  const written = [];
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: { writeText: (text) => (written.push(text), Promise.resolve()) },
    configurable: true,
  });
  return written;
}

function unmockClipboard() {
  delete globalThis.navigator.clipboard;
}

const cutKey = () => {
  const event = {
    type: "keydown",
    which: 88,
    ctrlKey: true,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  return event;
};

test("plugins/cutLine: selection", () => {
  const written = mockClipboard();
  const plugin = cutLine();

  assert.deepStrictEqual(
    plugin({ value: "hello world", selectionStart: 5, selectionEnd: 11 }, cutKey()),
    { value: "hello", selectionStart: 5, selectionEnd: 5 },
    "selection should be removed and caret collapsed",
  );
  assert.deepStrictEqual(written, [" world"], "selection should be copied to clipboard");

  unmockClipboard();
});

test("plugins/cutLine: whole line", () => {
  const written = mockClipboard();
  const plugin = cutLine();

  assert.deepStrictEqual(
    plugin({ value: "aa\nbb\ncc", selectionStart: 4, selectionEnd: 4 }, cutKey()),
    { value: "aa\ncc", selectionStart: 3, selectionEnd: 3 },
    "middle line should be cut with caret at the next line start",
  );

  assert.deepStrictEqual(
    plugin({ value: "aa\nbb", selectionStart: 1, selectionEnd: 1 }, cutKey()),
    { value: "bb", selectionStart: 0, selectionEnd: 0 },
    "cutting the first line should put the caret at 0",
  );

  assert.deepStrictEqual(
    plugin({ value: "aa\nbb", selectionStart: 4, selectionEnd: 4 }, cutKey()),
    { value: "aa", selectionStart: 2, selectionEnd: 2 },
    "cutting the last line should clamp the caret to the new end",
  );

  assert.deepStrictEqual(
    plugin({ value: "abc", selectionStart: 1, selectionEnd: 1 }, cutKey()),
    { value: "", selectionStart: 0, selectionEnd: 0 },
    "cutting the only line should empty the value",
  );

  assert.deepStrictEqual(written, ["bb", "aa", "bb", "abc"], "each cut line should be copied");

  unmockClipboard();
});

test("plugins/cutLine: guards", () => {
  const written = mockClipboard();
  const plugin = cutLine();

  assert.deepStrictEqual(
    plugin(
      { value: "aa", selectionStart: 0, selectionEnd: 0 },
      { type: "keydown", which: 65, ctrlKey: true, preventDefault() {} },
    ),
    undefined,
    "non-matching key should be a no-op",
  );

  assert.deepStrictEqual(
    plugin({ value: "aa", selectionStart: 0, selectionEnd: 0 }, { type: "input" }),
    undefined,
    "non-keydown event should be a no-op",
  );

  const customPlugin = cutLine((event) => event.which === 75);
  assert.deepStrictEqual(
    customPlugin(
      { value: "aa\nbb", selectionStart: 0, selectionEnd: 0 },
      { type: "keydown", which: 75, preventDefault() {} },
    ),
    { value: "bb", selectionStart: 0, selectionEnd: 0 },
    "custom predicate should trigger the cut",
  );

  assert.deepStrictEqual(written, ["aa"], "only the custom predicate cut should copy");
  unmockClipboard();

  const event = cutKey();
  assert.deepStrictEqual(
    plugin({ value: "aa\nbb", selectionStart: 0, selectionEnd: 0 }, event),
    undefined,
    "no Clipboard API should leave the event to the browser",
  );
  assert.ok(!event.defaultPrevented, "no Clipboard API should not preventDefault");
});

test("plugins preventDefault on the successful path", () => {
  const tabPlugin = tab();

  const indent = tabKey();
  tabPlugin({ value: "ab", selectionStart: 1, selectionEnd: 1 }, indent);
  assert.ok(indent.defaultPrevented, "tab indent should preventDefault");

  const outdent = shiftTabKey();
  tabPlugin({ value: "  ab", selectionStart: 4, selectionEnd: 4 }, outdent);
  assert.ok(outdent.defaultPrevented, "shift+tab outdent should preventDefault");

  const enter = enterKey();
  preserveIndent()({ value: "  ab", selectionStart: 4, selectionEnd: 4 }, enter);
  assert.ok(enter.defaultPrevented, "enter on an indented line should preventDefault");

  const written = mockClipboard();
  const cut = cutKey();
  cutLine()({ value: "aa\nbb\ncc", selectionStart: 4, selectionEnd: 4 }, cut);
  assert.ok(cut.defaultPrevented, "whole-line cut should preventDefault");
  unmockClipboard();
});

test("plugins/preserveIndent", () => {
  const editor = new Yace("#editor", { plugins: [preserveIndent()] });

  const value = "func {\n    return res;\n}";
  const indentedLine = value.indexOf("    return");

  pressEnter(editor, value, indentedLine + "    return res;".length);
  assert.deepStrictEqual(
    editor.textarea.value,
    "func {\n    return res;\n    \n}",
    "enter at end of line should preserve the indent on the new line",
  );

  // at column 0 there is no indent before the caret to preserve, so the plugin
  // stays out of the way and lets the native enter split the line — the old code
  // inserted "\n" + full indent here and doubled it to "        return res;"
  pressEnter(editor, value, indentedLine);
  assert.deepStrictEqual(editor.textarea.value, value, "enter at column 0 should not double the indent");

  pressEnter(editor, value, indentedLine + 2);
  assert.deepStrictEqual(
    editor.textarea.value,
    "func {\n  \n    return res;\n}",
    "enter inside the indent should split it without doubling",
  );

  pressEnter(editor, "return res;", 6);
  assert.deepStrictEqual(editor.textarea.value, "return res;", "enter on a line without indent should be a no-op");

  editor.textarea.value = "  abc";
  editor.textarea.selectionStart = 5;
  editor.textarea.selectionEnd = 5;
  editor.textarea.dispatchEvent({ type: "keydown", which: 65, preventDefault() {} });
  assert.deepStrictEqual(editor.textarea.value, "  abc", "non-enter keydown should be a no-op");

  editor.textarea.value = "  abc";
  editor.textarea.dispatchEvent({ type: "input", which: 13, preventDefault() {} });
  assert.deepStrictEqual(editor.textarea.value, "  abc", "enter on input event should be a no-op");
});

const props = (value, caret = value.length) => ({
  value,
  selectionStart: caret,
  selectionEnd: caret,
});

const typeKey = () => ({ type: "keydown", which: 65, preventDefault() {} });

const undoKey = () => {
  const event = {
    type: "keydown",
    which: 90,
    ctrlKey: true,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  return event;
};

const redoKey = () => {
  const event = {
    type: "keydown",
    which: 90,
    ctrlKey: true,
    shiftKey: true,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  return event;
};

const inputAt = (timeStamp) => ({ type: "input", timeStamp });

test("plugins/history: records inputs and walks undo/redo", () => {
  const plugin = history();
  const A = props("");
  const B = props("a");
  const C = props("ab");

  assert.deepStrictEqual(plugin(A, typeKey()), undefined, "first event initializes without changing props");
  assert.deepStrictEqual(plugin(B, inputAt(100)), undefined, "input records the new state");
  assert.deepStrictEqual(plugin(C, inputAt(1000)), undefined, "an input beyond the window records again");

  assert.deepStrictEqual(plugin(C, undoKey()), B, "undo returns the previous state");
  assert.deepStrictEqual(plugin(B, undoKey()), A, "second undo returns to the initial state");
  assert.deepStrictEqual(plugin(A, redoKey()), B, "redo returns forward");
  assert.deepStrictEqual(plugin(B, redoKey()), C, "second redo returns to the latest state");
});

test("plugins/history: a new input truncates the redo branch", () => {
  const plugin = history();
  const A = props("");
  const B = props("a");
  const C = props("ab");
  plugin(A, typeKey());
  plugin(B, inputAt(100));
  plugin(C, inputAt(1000));

  assert.deepStrictEqual(plugin(C, undoKey()), B, "undo goes back to B");

  const D = props("aX");
  plugin(D, inputAt(2000));
  assert.deepStrictEqual(plugin(D, redoKey()), D, "redo after a new edit is a no-op");
  assert.deepStrictEqual(plugin(D, undoKey()), B, "undo returns to B, not the dropped C");
});

test("plugins/history: cap evicts the oldest record", () => {
  const plugin = history({ limit: 3 });
  plugin(props(""), typeKey());
  plugin(props("a"), inputAt(1000));
  plugin(props("ab"), inputAt(2000));
  plugin(props("abc"), inputAt(3000));

  assert.deepStrictEqual(plugin(props("abc"), undoKey()).value, "ab", "first undo");
  assert.deepStrictEqual(plugin(props("ab"), undoKey()).value, "a", "second undo");
  assert.deepStrictEqual(plugin(props("a"), undoKey()).value, "a", "third undo clamps at the oldest kept record");
});

test("plugins/history: coalesces inputs within the window", () => {
  const plugin = history({ coalesceMs: 300 });
  const A = props("");
  plugin(A, typeKey());
  plugin(props("a"), inputAt(100));
  plugin(props("ab"), inputAt(200));

  assert.deepStrictEqual(plugin(props("ab"), undoKey()), A, "the coalesced burst is a single undo step");
});

test("plugins/history: an input right after undo does not coalesce into the restored record", () => {
  const plugin = history({ coalesceMs: 300 });
  const A = props("");
  const B = props("a");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  assert.deepStrictEqual(plugin(B, undoKey()), A, "undo restores the initial record");

  // 150 is within 300ms of the t=100 edit, but the undo reset the coalesce
  // clock, so this input must start a fresh record instead of overwriting A
  const C = props("b");
  plugin(C, inputAt(150));

  assert.deepStrictEqual(plugin(C, undoKey()), A, "the post-undo input is its own step, so undo returns A");
});

test("plugins/history: inputs beyond the window are separate steps", () => {
  const plugin = history({ coalesceMs: 300 });
  const A = props("");
  const B = props("a");
  const C = props("ab");
  plugin(A, typeKey());
  plugin(B, inputAt(100));
  plugin(C, inputAt(500));

  assert.deepStrictEqual(plugin(C, undoKey()), B, "beyond the window undo stops at the first input");
  assert.deepStrictEqual(plugin(B, undoKey()), A, "another undo reaches the initial state");
});

test("plugins/history: a missing timeStamp never coalesces", () => {
  const plugin = history();
  const A = props("");
  const B = props("a");
  const C = props("ab");
  plugin(A, typeKey());
  plugin(B, { type: "input" });
  plugin(C, { type: "input" });

  assert.deepStrictEqual(plugin(C, undoKey()), B, "without a clock each input is its own step");
});

test("plugins/history: caret-only keydown updates the record without adding one", () => {
  const plugin = history();
  const A = props("");
  const B = props("hi");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  const moved = props("hi", 0);
  assert.deepStrictEqual(plugin(moved, typeKey()), undefined, "a caret move does not return a record");

  assert.deepStrictEqual(plugin(moved, undoKey()), A, "undo returns to the initial state, not a caret snapshot");
  assert.deepStrictEqual(plugin(A, redoKey()), moved, "redo restores the value with the updated caret");
});

test("plugins/history: keydown checkpoints an unrecorded programmatic edit", () => {
  const plugin = history();
  const A = props("");
  const B = props("ab");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  // a later plugin edited the value on keydown without firing input (e.g. tab)
  const C = props("a  b");
  assert.deepStrictEqual(plugin(C, typeKey()), undefined, "the checkpoint does not return a record");
  assert.deepStrictEqual(plugin(C, undoKey()), B, "undo returns to the pre-edit state");
  assert.deepStrictEqual(plugin(B, redoKey()), C, "redo returns to the checkpointed edit");
});

test("plugins/history: undo records the current state so redo can return", () => {
  const plugin = history();
  const A = props("");
  const B = props("a");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  const C = props("aZ");
  assert.deepStrictEqual(plugin(C, undoKey()), B, "undo moves down after recording the current state");
  assert.deepStrictEqual(plugin(B, redoKey()), C, "redo returns to the value that existed at undo time");
});

test("plugins/history: redo checkpoints an unrecorded edit instead of reverting it", () => {
  const plugin = history();
  const A = props("");
  const B = props("ab");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  // a later plugin edited the value on keydown without firing input (e.g. tab)
  const C = props("a  b");
  assert.deepStrictEqual(plugin(C, redoKey()), undefined, "redo must not roll the edit back to the stale top");
  assert.deepStrictEqual(plugin(C, undoKey()), B, "undo returns to the state before the edit");
  assert.deepStrictEqual(plugin(B, redoKey()), C, "redo returns to the checkpointed edit");
});

test("plugins/history: limit is clamped to keep at least one record", () => {
  const plugin = history({ limit: 0 });
  plugin(props(""), typeKey());
  plugin(props("a"), inputAt(1000));
  plugin(props("ab"), inputAt(3000));

  assert.deepStrictEqual(plugin(props("ab"), undoKey()).value, "ab", "the single kept record survives undo");
});

test("plugins/history: undo on a fresh editor preventDefaults without crashing", () => {
  const plugin = history();
  const event = undoKey();
  assert.doesNotThrow(() => plugin(props(""), event), "a fresh undo does not throw");
  assert.ok(event.defaultPrevented, "a fresh undo still blocks native undo");
});

test("plugins/history: redo at the top is a no-op", () => {
  const plugin = history();
  const A = props("");
  const B = props("a");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  assert.deepStrictEqual(plugin(B, redoKey()), B, "redo at the newest record returns it unchanged");
});

test("plugins/history: undo at the bottom stays put", () => {
  const plugin = history();
  const A = props("");
  const B = props("a");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  assert.deepStrictEqual(plugin(B, undoKey()), A, "first undo reaches the bottom");
  assert.deepStrictEqual(plugin(A, undoKey()), A, "another undo at the bottom stays at the bottom");
});

test("plugins/history: integration through the editor", () => {
  const editor = new Yace("#editor", { plugins: [history()] });

  const setCaret = (value) => {
    editor.textarea.value = value;
    editor.textarea.selectionStart = value.length;
    editor.textarea.selectionEnd = value.length;
  };

  // a real keystroke fires keydown on the pre-edit value, then input on the new one
  const type = (prev, next, timeStamp) => {
    setCaret(prev);
    editor.textarea.dispatchEvent({ type: "keydown", which: 65, timeStamp, preventDefault() {} });
    setCaret(next);
    editor.textarea.dispatchEvent({ type: "input", timeStamp });
  };
  const dispatchHistoryKey = (shiftKey) => {
    editor.textarea.dispatchEvent({
      type: "keydown",
      which: 90,
      ctrlKey: true,
      shiftKey,
      preventDefault() {},
    });
  };

  type("", "a", 1500);
  type("a", "ab", 5000);

  dispatchHistoryKey(false);
  assert.deepStrictEqual(editor.textarea.value, "a", "undo restores the previous value through the editor");

  dispatchHistoryKey(false);
  assert.deepStrictEqual(editor.textarea.value, "", "second undo restores the initial empty value");

  dispatchHistoryKey(true);
  assert.deepStrictEqual(editor.textarea.value, "a", "redo re-applies the change");
});
