import { test } from "zora";
import "undom/register.js";

import Yace from "../src/index.js";
import preserveIndent from "../src/plugins/preserveIndent.js";
import isKey from "../src/plugins/isKey.js";
import tab from "../src/plugins/tab.js";
import cutLine from "../src/plugins/cutLine.js";

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

test("constructor", (t) => {
  const editor = new Yace("#editor");

  t.throws(() => new Yace(), "constructor should throw error when called without arguments");
  t.doesNotThrow(() => new Yace("#editor"), "constructor should not throw error when called without options");
  t.ok(editor instanceof Yace, "constructor should return editor instance");

  document.querySelector = () => null;
  t.throws(() => new Yace("#editor"), "it should throw error when dom element is not found");
  // restore mock
  document.querySelector = () => document.createElement("div");
});

test("custom container", (t) => {
  const container = document.createElement("div");
  const editor = new Yace(container);

  t.ok(editor instanceof Yace, "constructor should return editor instance");
});

test("instance", (t) => {
  const editor = new Yace("#editor", { value: "test" });

  t.equal(editor.value, "test", "instance should contain value");
  t.equal(typeof editor.onUpdate, "function", "instance should contain onUpdate method");
  t.equal(typeof editor.update, "function", "instance should contain update method");
  t.equal(typeof editor.destroy, "function", "instance should contain destroy method");
  t.equal(typeof editor.textarea, "object", "instance should contain textarea property");
  t.equal(typeof editor.textarea, "object", "instance should contain textarea property");
});

test("textarea", (t) => {
  const editor = new Yace("#editor", { value: "test" });
  t.ok(editor.textarea.__handlers.input.length, "textarea should have input handler");
  t.ok(editor.textarea.__handlers.keydown.length, "textarea should have keydown handler");
  t.ok(editor.textarea.style, "textarea should have inline styles");
  t.equal(editor.textarea.value, "test", "textarea should have value same in option");
});

test("pre", (t) => {
  const editor = new Yace("#editor", { value: "test" });
  t.ok(editor.pre, "pre should exist");
  t.ok(editor.pre.nodeName, "pre should have nodeName 'pre'");
  t.ok(editor.pre.style, "pre should have inline styles");
  t.equal(editor.pre.innerHTML, "test<br/>", "pre should have initial html");

  dispatchTextareaEvent(editor.textarea, "new value");
  t.equal(editor.pre.innerHTML, "new value<br/>", "pre should update after textarea was changed");
});

test(".onUpdate()", (t) => {
  const editor = new Yace("#editor");

  let calledTimes = 0;
  let value = null;
  editor.onUpdate((newValue) => {
    calledTimes++;
    value = newValue;
  });

  t.equal(calledTimes, 0, "callback should not be called during initialization");

  dispatchTextareaEvent(editor.textarea, "new value");

  t.equal(calledTimes, 1, "callback should be called when input event was happened");
  t.equal(value, "new value", "callback should be called with new value");
});

test(".update()", (t) => {
  const editor = new Yace("#editor");

  // update only value
  editor.update({ value: "updated value" });
  t.equal(editor.textarea.value, "updated value", "textarea value should be updated");
  t.equal(editor.pre.innerHTML, "updated value<br/>", "pre html should be updated");

  // update only selections
  editor.update({ selectionStart: 1, selectionEnd: 2 });
  t.equal(editor.textarea.value, "updated value", "textarea value should be same");
  t.equal(editor.pre.innerHTML, "updated value<br/>", "pre value should be same");
  t.equal(editor.textarea.selectionStart, 1, "selectionStart should be updated");
  t.equal(editor.textarea.selectionEnd, 2, "selectionEnd should be updated");

  // update value and selection
  editor.update({
    value: "new updated value",
    selectionStart: 3,
    selectionEnd: 4,
  });
  t.equal(editor.textarea.value, "new updated value", "textarea value should be updated");
  t.equal(editor.pre.innerHTML, "new updated value<br/>", "pre value should be updated");
  t.equal(editor.textarea.selectionStart, 3, "selectionStart should be updated");
  t.equal(editor.textarea.selectionEnd, 4, "selectionEnd should be updated");
});

test(".update() keeps selection when only value changes", (t) => {
  const editor = new Yace("#editor", { value: "hello world" });

  editor.update({ selectionStart: 3, selectionEnd: 5 });
  editor.update({ value: "hello there" });

  t.equal(editor.textarea.value, "hello there", "value should be updated");
  t.equal(editor.textarea.selectionStart, 3, "selectionStart should be unchanged");
  t.equal(editor.textarea.selectionEnd, 5, "selectionEnd should be unchanged");
});

test("value normalization", (t) => {
  const editorZero = new Yace("#editor", { value: 0 });
  t.equal(editorZero.textarea.value, "0", "constructor value 0 should render as '0'");
  t.equal(editorZero.pre.innerHTML, "0<br/>", "pre should render '0' for numeric constructor value");

  const editorUndefined = new Yace("#editor", { value: undefined });
  t.equal(editorUndefined.textarea.value, "", "constructor value undefined should become empty string");

  const editor = new Yace("#editor");
  t.doesNotThrow(() => editor.update({ value: 0 }), "update with value 0 should not throw");
  t.equal(editor.textarea.value, "0", "update value 0 should render '0'");
  t.equal(editor.pre.innerHTML, "0<br/>", "pre should render '0'");
});

test(".destroy()", (t) => {
  const editor = new Yace("#editor");
  const { textarea, root } = editor;
  editor.destroy();

  t.notOk(textarea.__handlers.input.length, "input handler should be destroyed");
  t.notOk(textarea.__handlers.keydown.length, "keydown handler should be destroyed");
  t.notOk(textarea.__handlers.compositionend.length, "compositionend handler should be destroyed");
  t.equal(root.childNodes.length, 0, "created nodes should be removed");
  t.equal(editor.textarea, null, "textarea reference should be cleared");
  t.equal(editor.pre, null, "pre reference should be cleared");
  t.doesNotThrow(() => editor.destroy(), "double destroy should be a no-op");
});

test(".destroy() restores container styles", (t) => {
  const root = document.createElement("div");
  root.style.fontSize = "12px";

  const editor = new Yace(root, {
    value: "1\n2\n3",
    lineNumbers: true,
    styles: { fontSize: "200px" },
  });

  t.equal(root.style.fontSize, "200px", "init should apply option styles");
  t.equal(root.style.paddingLeft, "2ch", "line numbers should set padding");
  t.equal(root.childNodes.length, 3, "editor should create three nodes");

  editor.destroy();

  t.equal(root.style.fontSize, "12px", "prior inline style should be restored");
  t.equal(root.style.paddingLeft, "", "padding mutation should be reverted");
  t.equal(root.style.position, "", "root styles should be reverted");
  t.equal(root.childNodes.length, 0, "lines node should be removed too");
});

test(".destroy() survives externally detached nodes", (t) => {
  const root = document.createElement("div");
  const editor = new Yace(root, { styles: { fontSize: "200px" } });

  root.removeChild(editor.textarea);
  root.removeChild(editor.pre);

  t.doesNotThrow(() => editor.destroy(), "destroy should not throw");
  t.equal(root.style.fontSize, "", "styles should still be restored");
  t.equal(editor.textarea, null, "references should still be cleared");
});

test(".update() after destroy is a no-op", (t) => {
  const editor = new Yace("#editor");
  editor.destroy();

  t.doesNotThrow(() => editor.update({ value: "late" }), "update should not throw");
});

test("re-init on the same node after destroy", (t) => {
  const root = document.createElement("div");

  const first = new Yace(root, { value: "one" });
  first.destroy();
  const second = new Yace(root, { value: "two" });

  t.equal(root.childNodes.length, 2, "only one set of nodes should exist");
  t.equal(second.textarea.value, "two", "new editor should work after destroy");
});

test("IME composition guard", (t) => {
  const editor = new Yace("#editor");

  let calledTimes = 0;
  editor.onUpdate(() => {
    calledTimes++;
  });

  editor.textarea.value = "ni";
  editor.textarea.dispatchEvent({ type: "input", isComposing: true });
  t.equal(calledTimes, 0, "input during composition should not re-render");
  t.equal(editor.pre.innerHTML, "<br/>", "pre should stay empty during composition");

  editor.textarea.dispatchEvent({ type: "keydown", keyCode: 229 });
  t.equal(calledTimes, 0, "keydown with keyCode 229 should not re-render");

  editor.textarea.value = "你好";
  editor.textarea.dispatchEvent({ type: "compositionend" });
  t.equal(calledTimes, 1, "compositionend should re-render once");
  t.equal(editor.textarea.value, "你好", "textarea should keep the committed value");
  t.equal(editor.pre.innerHTML, "你好<br/>", "pre should render the committed value");

  const upperCasePlugin = ({ value }) => ({ value: value.toUpperCase() });
  const pluginEditor = new Yace("#editor", { plugins: [upperCasePlugin] });
  pluginEditor.textarea.value = "abc";
  pluginEditor.textarea.dispatchEvent({ type: "compositionend" });
  t.equal(pluginEditor.textarea.value, "ABC", "compositionend should run the plugin pipeline");
});

test("options.lineNumber", (t) => {
  const editor = new Yace("#editor", { lineNumbers: true });

  const lineNumbersElement = editor.root.childNodes[2];

  t.ok(lineNumbersElement, "line numbers element should exist");
  t.ok(lineNumbersElement.innerHTML, "line numbers html should exist");
  t.ok(lineNumbersElement.innerHTML.split("\n"), "line numbers html should have one number");
  t.equal(editor.root.style.paddingLeft, "2ch", "root element should have 2ch padding left");

  editor.update({ value: "1\n2\n3\n4" });
  t.equal(lineNumbersElement.innerHTML.split("\n").length, 4, "it should be 4 line number after update");
  t.equal(editor.root.style.paddingLeft, "2ch", "root element should have 2ch padding left");

  editor.update({ value: "1\n2\n3\n4\n5\n6\n7\n8\n9\n10" });
  t.equal(lineNumbersElement.innerHTML.split("\n").length, 10, "it should be 4 line number after update");
  t.equal(editor.root.style.paddingLeft, "3ch", "root element should have 3ch padding left");
});

test("options.highlighter", (t) => {
  const editor = new Yace("#editor", {
    value: "test",
    highlighter: (value) => value.toUpperCase(),
  });

  t.equal(editor.pre.innerHTML, "TEST<br/>", "it should transform pre innerHTML when editor init");
  t.equal(editor.textarea.value, "test", "textarea should have initial value");

  editor.update({ value: "test test" });
  t.equal(editor.pre.innerHTML, "TEST TEST<br/>", "it should transform pre innerHTML when editor was updated");
  t.equal(editor.textarea.value, "test test", "textarea should have not transformed value");
});

test("options.styles", (t) => {
  const editor = new Yace("#editor", {
    styles: { fontSize: "200px", myAwesomeStyle: "foo" },
  });

  t.equal(editor.root.style.fontSize, "200px", "it should update fontSize style");
  t.equal(editor.root.style.myAwesomeStyle, "foo", "it should add custom style");
});

test("options.plugins", (t) => {
  const upperCasePlugin = ({ value }) => ({ value: value.toUpperCase() });

  const editor = new Yace("#editor", {
    plugins: [upperCasePlugin],
  });

  dispatchTextareaEvent(editor.textarea, "new value", "input");
  t.equal(editor.textarea.value, "NEW VALUE", "it should transform textarea value when input event");
  t.equal(editor.pre.innerHTML, "NEW VALUE<br/>", "it should transform pre html value when input event");

  dispatchTextareaEvent(editor.textarea, "new value", "keydown");
  t.equal(editor.textarea.value, "NEW VALUE", "it should transform textarea value when keydown event");
  t.equal(editor.pre.innerHTML, "NEW VALUE<br/>", "it should transform textarea value when keydown event");
});

test("plugins/isKey", (t) => {
  t.ok(isKey("enter", { which: 13 }), "matches a plain key by code");
  t.notOk(isKey("enter", { which: 65 }), "does not match a different key");
  t.ok(isKey("a", { which: 65 }), "matches a letter via toKeyCode fallback");
  t.ok(isKey("ctrl/cmd+z", { which: 90, ctrlKey: true }), "matches a modifier combo");
  t.notOk(isKey("ctrl/cmd+z", { which: 90 }), "does not match when the required modifier is absent");
  t.ok(isKey("shift", { shiftKey: true }), "matches a modifier-only combo");
});

const tabKey = () => ({ type: "keydown", which: 9, preventDefault() {} });
const shiftTabKey = () => ({
  type: "keydown",
  which: 9,
  shiftKey: true,
  preventDefault() {},
});

test("plugins/tab: indent", (t) => {
  const plugin = tab();

  t.equal(
    plugin({ value: "ab", selectionStart: 1, selectionEnd: 1 }, tabKey()),
    { value: "a  b", selectionStart: 3, selectionEnd: 3 },
    "collapsed caret should insert the tab character"
  );

  t.equal(
    plugin({ value: "a\nb", selectionStart: 0, selectionEnd: 3 }, tabKey()),
    { value: "  a\n  b", selectionStart: 2, selectionEnd: 7 },
    "selection through both lines should indent both"
  );

  t.equal(
    plugin({ value: "a\nb", selectionStart: 0, selectionEnd: 2 }, tabKey()),
    { value: "  a\nb", selectionStart: 2, selectionEnd: 4 },
    "selection ending at column 0 should not indent the next line"
  );

  t.equal(
    plugin({ value: "ab", selectionStart: 1, selectionEnd: 1 }, { type: "input", which: 9 }),
    undefined,
    "non-keydown event should be a no-op"
  );

  t.equal(
    plugin({ value: "ab", selectionStart: 1, selectionEnd: 1 }, { type: "keydown", which: 65, preventDefault() {} }),
    undefined,
    "non-tab key should be a no-op"
  );

  t.equal(
    tab("\t")({ value: "ab", selectionStart: 1, selectionEnd: 1 }, tabKey()),
    { value: "a\tb", selectionStart: 2, selectionEnd: 2 },
    "custom tab character should be supported"
  );
});

test("plugins/tab: outdent", (t) => {
  const plugin = tab();

  t.equal(
    plugin({ value: "  a\n  b", selectionStart: 2, selectionEnd: 6 }, shiftTabKey()),
    { value: "a\nb", selectionStart: 0, selectionEnd: 2 },
    "selection through both lines should outdent both"
  );

  t.equal(
    plugin({ value: "  a\n  b", selectionStart: 0, selectionEnd: 4 }, shiftTabKey()),
    { value: "a\n  b", selectionStart: 0, selectionEnd: 2 },
    "selection ending at column 0 should not outdent the next line"
  );

  t.equal(
    plugin({ value: "a\nb", selectionStart: 0, selectionEnd: 3 }, shiftTabKey()),
    undefined,
    "nothing to outdent should be a no-op"
  );

  t.equal(
    plugin({ value: "  ab", selectionStart: 4, selectionEnd: 4 }, shiftTabKey()),
    { value: "ab", selectionStart: 2, selectionEnd: 2 },
    "collapsed caret should outdent the current line"
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

test("plugins/cutLine: selection", (t) => {
  const written = mockClipboard();
  const plugin = cutLine();

  t.equal(
    plugin({ value: "hello world", selectionStart: 5, selectionEnd: 11 }, cutKey()),
    { value: "hello", selectionStart: 5, selectionEnd: 5 },
    "selection should be removed and caret collapsed"
  );
  t.equal(written, [" world"], "selection should be copied to clipboard");

  unmockClipboard();
});

test("plugins/cutLine: whole line", (t) => {
  const written = mockClipboard();
  const plugin = cutLine();

  t.equal(
    plugin({ value: "aa\nbb\ncc", selectionStart: 4, selectionEnd: 4 }, cutKey()),
    { value: "aa\ncc", selectionStart: 3, selectionEnd: 3 },
    "middle line should be cut with caret at the next line start"
  );

  t.equal(
    plugin({ value: "aa\nbb", selectionStart: 1, selectionEnd: 1 }, cutKey()),
    { value: "bb", selectionStart: 0, selectionEnd: 0 },
    "cutting the first line should put the caret at 0"
  );

  t.equal(
    plugin({ value: "aa\nbb", selectionStart: 4, selectionEnd: 4 }, cutKey()),
    { value: "aa", selectionStart: 2, selectionEnd: 2 },
    "cutting the last line should clamp the caret to the new end"
  );

  t.equal(
    plugin({ value: "abc", selectionStart: 1, selectionEnd: 1 }, cutKey()),
    { value: "", selectionStart: 0, selectionEnd: 0 },
    "cutting the only line should empty the value"
  );

  t.equal(written, ["bb", "aa", "bb", "abc"], "each cut line should be copied");

  unmockClipboard();
});

test("plugins/cutLine: guards", (t) => {
  const written = mockClipboard();
  const plugin = cutLine();

  t.equal(
    plugin(
      { value: "aa", selectionStart: 0, selectionEnd: 0 },
      { type: "keydown", which: 65, ctrlKey: true, preventDefault() {} }
    ),
    undefined,
    "non-matching key should be a no-op"
  );

  t.equal(
    plugin({ value: "aa", selectionStart: 0, selectionEnd: 0 }, { type: "input" }),
    undefined,
    "non-keydown event should be a no-op"
  );

  const customPlugin = cutLine((event) => event.which === 75);
  t.equal(
    customPlugin(
      { value: "aa\nbb", selectionStart: 0, selectionEnd: 0 },
      { type: "keydown", which: 75, preventDefault() {} }
    ),
    { value: "bb", selectionStart: 0, selectionEnd: 0 },
    "custom predicate should trigger the cut"
  );

  t.equal(written, ["aa"], "only the custom predicate cut should copy");
  unmockClipboard();

  const event = cutKey();
  t.equal(
    plugin({ value: "aa\nbb", selectionStart: 0, selectionEnd: 0 }, event),
    undefined,
    "no Clipboard API should leave the event to the browser"
  );
  t.notOk(event.defaultPrevented, "no Clipboard API should not preventDefault");
});

test("plugins/preserveIndent", (t) => {
  const editor = new Yace("#editor", { plugins: [preserveIndent()] });

  const value = "func {\n    return res;\n}";
  const indentedLine = value.indexOf("    return");

  pressEnter(editor, value, indentedLine + "    return res;".length);
  t.equal(
    editor.textarea.value,
    "func {\n    return res;\n    \n}",
    "enter at end of line should preserve the indent on the new line"
  );

  // at column 0 there is no indent before the caret to preserve, so the plugin
  // stays out of the way and lets the native enter split the line — the old code
  // inserted "\n" + full indent here and doubled it to "        return res;"
  pressEnter(editor, value, indentedLine);
  t.equal(editor.textarea.value, value, "enter at column 0 should not double the indent");

  pressEnter(editor, value, indentedLine + 2);
  t.equal(
    editor.textarea.value,
    "func {\n  \n    return res;\n}",
    "enter inside the indent should split it without doubling"
  );

  pressEnter(editor, "return res;", 6);
  t.equal(editor.textarea.value, "return res;", "enter on a line without indent should be a no-op");

  editor.textarea.value = "  abc";
  editor.textarea.selectionStart = 5;
  editor.textarea.selectionEnd = 5;
  editor.textarea.dispatchEvent({ type: "keydown", which: 65, preventDefault() {} });
  t.equal(editor.textarea.value, "  abc", "non-enter keydown should be a no-op");

  editor.textarea.value = "  abc";
  editor.textarea.dispatchEvent({ type: "input", which: 13, preventDefault() {} });
  t.equal(editor.textarea.value, "  abc", "enter on input event should be a no-op");
});
