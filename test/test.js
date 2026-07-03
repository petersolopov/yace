import { test } from "zora";
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

test("constructor", (t) => {
  const editor = new Yace("#editor");

  t.throws(() => new Yace(), "constructor should throw error when called without arguments");
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
  t.equal(editor.root, container, "the passed node should be used as the root");
});

test("instance", (t) => {
  const editor = new Yace("#editor", { value: "test" });

  t.equal(editor.value, "test", "instance should contain value");
  t.equal(typeof editor.onUpdate, "function", "instance should contain onUpdate method");
  t.equal(typeof editor.update, "function", "instance should contain update method");
  t.equal(typeof editor.destroy, "function", "instance should contain destroy method");
  t.equal(typeof editor.textarea, "object", "instance should contain textarea property");
});

test("textarea", (t) => {
  const editor = new Yace("#editor", { value: "test" });
  t.ok(editor.textarea.style, "textarea should have a style object");
  t.equal(editor.textarea.value, "test", "textarea should have value same in option");
});

test("pre", (t) => {
  const editor = new Yace("#editor", { value: "test" });
  t.ok(editor.pre, "pre should exist");
  t.equal(editor.pre.nodeName, "PRE", "pre element should have nodeName PRE");
  t.ok(editor.pre.style, "pre should have a style object");
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

test(".onUpdate() fires only on real value changes", (t) => {
  const editor = new Yace("#editor", { value: "abc" });

  const calls = [];
  editor.onUpdate((value) => calls.push(value));

  editor.update({ selectionStart: 1, selectionEnd: 2 });
  t.equal(calls.length, 0, "a selection-only update should not fire onUpdate");

  editor.update({ value: "abc" });
  t.equal(calls.length, 0, "setting the same value should not fire onUpdate");

  editor.update({ value: "abcd" });
  t.equal(calls, ["abcd"], "a real value change fires once with the new value");
});

test(".onUpdate() reports the post-plugin value", (t) => {
  const upperCasePlugin = ({ value }) => ({ value: value.toUpperCase() });
  const editor = new Yace("#editor", { plugins: [upperCasePlugin] });

  let received = null;
  editor.onUpdate((value) => (received = value));
  dispatchTextareaEvent(editor.textarea, "xyz");

  t.equal(received, "XYZ", "onUpdate should receive the value after plugins run");
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
  editor.update({ value: 0 });
  t.equal(editor.textarea.value, "0", "update value 0 should render '0'");
  t.equal(editor.pre.innerHTML, "0<br/>", "pre should render '0'");
});

test(".updateOptions() replaces the highlighter and re-renders", (t) => {
  const editor = new Yace("#editor", { value: "abc" });

  editor.updateOptions({ highlighter: (value) => value.toUpperCase() });

  t.equal(editor.pre.innerHTML, "ABC<br/>", "new highlighter should re-render the current value");
  t.equal(editor.textarea.value, "abc", "textarea value should be untouched");
});

test(".updateOptions() replaces the plugins", (t) => {
  const editor = new Yace("#editor", { value: "abc" });

  const upperCasePlugin = ({ value }) => ({ value: value.toUpperCase() });
  editor.updateOptions({ plugins: [upperCasePlugin] });
  dispatchTextareaEvent(editor.textarea, "next");

  t.equal(editor.textarea.value, "NEXT", "new plugins should take effect on the next event");
});

test(".updateOptions() routes value through update() and fires onUpdate", (t) => {
  const editor = new Yace("#editor", { value: "abc" });

  let updated = null;
  editor.onUpdate((value) => (updated = value));
  editor.updateOptions({ value: "fresh" });

  t.equal(editor.textarea.value, "fresh", "value should route through update()");
  t.equal(updated, "fresh", "onUpdate should fire for a value change");
});

test(".updateOptions() toggles line numbers", (t) => {
  const root = document.createElement("div");
  const editor = new Yace(root, { value: "1\n2\n3" });

  t.equal(root.childNodes.length, 2, "no lines element without lineNumbers");

  editor.updateOptions({ lineNumbers: true });
  t.equal(root.childNodes.length, 3, "lines element should be created");
  t.equal(root.style.paddingLeft, "2ch", "padding should be applied");

  editor.updateOptions({ lineNumbers: false });
  t.equal(root.childNodes.length, 2, "lines element should be removed");
  t.equal(root.style.paddingLeft, "", "padding should be reverted");
});

test(".updateOptions() keeps user padding when line numbers turn off", (t) => {
  const root = document.createElement("div");
  const editor = new Yace(root, {
    value: "1\n2\n3",
    lineNumbers: true,
    styles: { paddingLeft: "10px" },
  });

  t.equal(root.style.paddingLeft, "2ch", "line numbers should own the padding");

  editor.updateOptions({ lineNumbers: false });
  t.equal(root.style.paddingLeft, "10px", "user padding should come back, not the pre-editor value");

  editor.updateOptions({ lineNumbers: true });
  editor.updateOptions({ styles: { paddingLeft: "24px" }, lineNumbers: false });
  t.equal(root.style.paddingLeft, "24px", "a padding set via updateOptions should become the new base");

  editor.destroy();
  t.equal(root.style.paddingLeft, "", "destroy still restores the pre-editor value");
});

test(".updateOptions() styles stay restorable by destroy", (t) => {
  const root = document.createElement("div");
  root.style.color = "red";
  const editor = new Yace(root, { styles: { fontSize: "20px" } });

  editor.updateOptions({ styles: { color: "blue", background: "black" } });
  t.equal(root.style.color, "blue", "new style should be applied");

  editor.destroy();
  t.equal(root.style.color, "red", "pre-existing inline style should be restored");
  t.equal(root.style.background, "", "added style should be removed");
  t.equal(root.style.fontSize, "", "constructor style should be removed");
});

test(".updateOptions() after destroy is a no-op", (t) => {
  const editor = new Yace("#editor");
  editor.destroy();

  t.doesNotThrow(() => editor.updateOptions({ lineNumbers: true }), "updateOptions should not throw");
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
  t.equal(lineNumbersElement.innerHTML.split("\n").length, 1, "a single-line value should render one line number");
  t.equal(editor.root.style.paddingLeft, "2ch", "root element should have 2ch padding left");

  editor.update({ value: "1\n2\n3\n4" });
  t.equal(lineNumbersElement.innerHTML.split("\n").length, 4, "it should be 4 line number after update");
  t.equal(editor.root.style.paddingLeft, "2ch", "root element should have 2ch padding left");

  editor.update({ value: "1\n2\n3\n4\n5\n6\n7\n8\n9\n10" });
  t.equal(lineNumbersElement.innerHTML.split("\n").length, 10, "it should be 10 line numbers after update");
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

test("default highlighter escapes HTML entities", (t) => {
  const editor = new Yace("#editor", { value: "& < > \" '" });

  t.equal(editor.pre.innerHTML, "&amp; &lt; &gt; &quot; &#039;<br/>", "pre should escape all five HTML entities");

  const withLines = new Yace("#editor", {
    value: "& < > \" '",
    lineNumbers: true,
  });

  t.ok(
    withLines.lines.innerHTML.includes("&amp; &lt; &gt; &quot; &#039;"),
    "the line-number layer should escape entities too"
  );
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

test("plugins pipeline: each plugin receives the previous one's output", (t) => {
  const editor = new Yace("#editor");

  let captured = null;
  const upper = ({ value }) => ({ value: value.toUpperCase() });
  const capture = (props) => {
    captured = props;
  };
  editor.updateOptions({ plugins: [upper, capture] });
  dispatchTextareaEvent(editor.textarea, "abc");

  t.equal(captured.value, "ABC", "the second plugin receives the transformed value");
  t.equal(editor.textarea.value, "ABC", "a plugin returning undefined is a passthrough");
});

test("plugins pipeline: partial results from different plugins merge", (t) => {
  const editor = new Yace("#editor");

  const setValue = () => ({ value: "merged" });
  const setStart = () => ({ selectionStart: 3 });
  editor.updateOptions({ plugins: [setValue, setStart] });
  dispatchTextareaEvent(editor.textarea, "x");

  t.equal(editor.textarea.value, "merged", "value from the first plugin applies");
  t.equal(editor.textarea.selectionStart, 3, "selectionStart from the second plugin applies");
});

test("plugins/isKey", (t) => {
  t.ok(isKey("enter", { which: 13 }), "matches a plain key by code");
  t.notOk(isKey("enter", { which: 65 }), "does not match a different key");
  t.ok(isKey("a", { which: 65 }), "matches a letter via toKeyCode fallback");
  t.ok(isKey("ctrl/cmd+z", { which: 90, ctrlKey: true }), "matches a modifier combo");
  t.notOk(isKey("ctrl/cmd+z", { which: 90 }), "does not match when the required modifier is absent");
  t.ok(isKey("shift", { shiftKey: true }), "matches a modifier-only combo");
});

test("plugins/isKey: edge cases", (t) => {
  t.notOk(isKey("enter", { which: 13, shiftKey: true }), "an unexpected modifier rejects an otherwise matching key");
  t.ok(isKey("escape", { which: 27 }), "matches escape by code");
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

  t.equal(
    plugin({ value: "  ab", selectionStart: 0, selectionEnd: 0 }, shiftTabKey()),
    { value: "ab", selectionStart: 0, selectionEnd: 0 },
    "caret at column 0 should stay at column 0, not go negative"
  );

  t.equal(
    plugin({ value: "  ab", selectionStart: 1, selectionEnd: 1 }, shiftTabKey()),
    { value: "ab", selectionStart: 0, selectionEnd: 0 },
    "caret inside the removed indent should clamp to column 0"
  );

  t.equal(
    plugin({ value: "a\n  b", selectionStart: 0, selectionEnd: 3 }, shiftTabKey()),
    { value: "a\nb", selectionStart: 0, selectionEnd: 2 },
    "selection ending inside the removed indent should clamp to the line start"
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

test("plugins preventDefault on the successful path", (t) => {
  const tabPlugin = tab();

  const indent = tabKey();
  tabPlugin({ value: "ab", selectionStart: 1, selectionEnd: 1 }, indent);
  t.ok(indent.defaultPrevented, "tab indent should preventDefault");

  const outdent = shiftTabKey();
  tabPlugin({ value: "  ab", selectionStart: 4, selectionEnd: 4 }, outdent);
  t.ok(outdent.defaultPrevented, "shift+tab outdent should preventDefault");

  const enter = enterKey();
  preserveIndent()({ value: "  ab", selectionStart: 4, selectionEnd: 4 }, enter);
  t.ok(enter.defaultPrevented, "enter on an indented line should preventDefault");

  const written = mockClipboard();
  const cut = cutKey();
  cutLine()({ value: "aa\nbb\ncc", selectionStart: 4, selectionEnd: 4 }, cut);
  t.ok(cut.defaultPrevented, "whole-line cut should preventDefault");
  unmockClipboard();
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

test("plugins/history: records inputs and walks undo/redo", (t) => {
  const plugin = history();
  const A = props("");
  const B = props("a");
  const C = props("ab");

  t.equal(plugin(A, typeKey()), undefined, "first event initializes without changing props");
  t.equal(plugin(B, inputAt(100)), undefined, "input records the new state");
  t.equal(plugin(C, inputAt(1000)), undefined, "an input beyond the window records again");

  t.equal(plugin(C, undoKey()), B, "undo returns the previous state");
  t.equal(plugin(B, undoKey()), A, "second undo returns to the initial state");
  t.equal(plugin(A, redoKey()), B, "redo returns forward");
  t.equal(plugin(B, redoKey()), C, "second redo returns to the latest state");
});

test("plugins/history: a new input truncates the redo branch", (t) => {
  const plugin = history();
  const A = props("");
  const B = props("a");
  const C = props("ab");
  plugin(A, typeKey());
  plugin(B, inputAt(100));
  plugin(C, inputAt(1000));

  t.equal(plugin(C, undoKey()), B, "undo goes back to B");

  const D = props("aX");
  plugin(D, inputAt(2000));
  t.equal(plugin(D, redoKey()), D, "redo after a new edit is a no-op");
  t.equal(plugin(D, undoKey()), B, "undo returns to B, not the dropped C");
});

test("plugins/history: cap evicts the oldest record", (t) => {
  const plugin = history({ limit: 3 });
  plugin(props(""), typeKey());
  plugin(props("a"), inputAt(1000));
  plugin(props("ab"), inputAt(2000));
  plugin(props("abc"), inputAt(3000));

  t.equal(plugin(props("abc"), undoKey()).value, "ab", "first undo");
  t.equal(plugin(props("ab"), undoKey()).value, "a", "second undo");
  t.equal(plugin(props("a"), undoKey()).value, "a", "third undo clamps at the oldest kept record");
});

test("plugins/history: coalesces inputs within the window", (t) => {
  const plugin = history({ coalesceMs: 300 });
  const A = props("");
  plugin(A, typeKey());
  plugin(props("a"), inputAt(100));
  plugin(props("ab"), inputAt(200));

  t.equal(plugin(props("ab"), undoKey()), A, "the coalesced burst is a single undo step");
});

test("plugins/history: an input right after undo does not coalesce into the restored record", (t) => {
  const plugin = history({ coalesceMs: 300 });
  const A = props("");
  const B = props("a");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  t.equal(plugin(B, undoKey()), A, "undo restores the initial record");

  // 150 is within 300ms of the t=100 edit, but the undo reset the coalesce
  // clock, so this input must start a fresh record instead of overwriting A
  const C = props("b");
  plugin(C, inputAt(150));

  t.equal(plugin(C, undoKey()), A, "the post-undo input is its own step, so undo returns A");
});

test("plugins/history: inputs beyond the window are separate steps", (t) => {
  const plugin = history({ coalesceMs: 300 });
  const A = props("");
  const B = props("a");
  const C = props("ab");
  plugin(A, typeKey());
  plugin(B, inputAt(100));
  plugin(C, inputAt(500));

  t.equal(plugin(C, undoKey()), B, "beyond the window undo stops at the first input");
  t.equal(plugin(B, undoKey()), A, "another undo reaches the initial state");
});

test("plugins/history: a missing timeStamp never coalesces", (t) => {
  const plugin = history();
  const A = props("");
  const B = props("a");
  const C = props("ab");
  plugin(A, typeKey());
  plugin(B, { type: "input" });
  plugin(C, { type: "input" });

  t.equal(plugin(C, undoKey()), B, "without a clock each input is its own step");
});

test("plugins/history: caret-only keydown updates the record without adding one", (t) => {
  const plugin = history();
  const A = props("");
  const B = props("hi");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  const moved = props("hi", 0);
  t.equal(plugin(moved, typeKey()), undefined, "a caret move does not return a record");

  t.equal(plugin(moved, undoKey()), A, "undo returns to the initial state, not a caret snapshot");
  t.equal(plugin(A, redoKey()), moved, "redo restores the value with the updated caret");
});

test("plugins/history: keydown checkpoints an unrecorded programmatic edit", (t) => {
  const plugin = history();
  const A = props("");
  const B = props("ab");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  // a later plugin edited the value on keydown without firing input (e.g. tab)
  const C = props("a  b");
  t.equal(plugin(C, typeKey()), undefined, "the checkpoint does not return a record");
  t.equal(plugin(C, undoKey()), B, "undo returns to the pre-edit state");
  t.equal(plugin(B, redoKey()), C, "redo returns to the checkpointed edit");
});

test("plugins/history: undo records the current state so redo can return", (t) => {
  const plugin = history();
  const A = props("");
  const B = props("a");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  const C = props("aZ");
  t.equal(plugin(C, undoKey()), B, "undo moves down after recording the current state");
  t.equal(plugin(B, redoKey()), C, "redo returns to the value that existed at undo time");
});

test("plugins/history: redo checkpoints an unrecorded edit instead of reverting it", (t) => {
  const plugin = history();
  const A = props("");
  const B = props("ab");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  // a later plugin edited the value on keydown without firing input (e.g. tab)
  const C = props("a  b");
  t.equal(plugin(C, redoKey()), undefined, "redo must not roll the edit back to the stale top");
  t.equal(plugin(C, undoKey()), B, "undo returns to the state before the edit");
  t.equal(plugin(B, redoKey()), C, "redo returns to the checkpointed edit");
});

test("plugins/history: limit is clamped to keep at least one record", (t) => {
  const plugin = history({ limit: 0 });
  plugin(props(""), typeKey());
  plugin(props("a"), inputAt(1000));
  plugin(props("ab"), inputAt(3000));

  t.equal(plugin(props("ab"), undoKey()).value, "ab", "the single kept record survives undo");
});

test("plugins/history: undo on a fresh editor preventDefaults without crashing", (t) => {
  const plugin = history();
  const event = undoKey();
  t.doesNotThrow(() => plugin(props(""), event), "a fresh undo does not throw");
  t.ok(event.defaultPrevented, "a fresh undo still blocks native undo");
});

test("plugins/history: redo at the top is a no-op", (t) => {
  const plugin = history();
  const A = props("");
  const B = props("a");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  t.equal(plugin(B, redoKey()), B, "redo at the newest record returns it unchanged");
});

test("plugins/history: undo at the bottom stays put", (t) => {
  const plugin = history();
  const A = props("");
  const B = props("a");
  plugin(A, typeKey());
  plugin(B, inputAt(100));

  t.equal(plugin(B, undoKey()), A, "first undo reaches the bottom");
  t.equal(plugin(A, undoKey()), A, "another undo at the bottom stays at the bottom");
});

test("plugins/history: integration through the editor", (t) => {
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
  t.equal(editor.textarea.value, "a", "undo restores the previous value through the editor");

  dispatchHistoryKey(false);
  t.equal(editor.textarea.value, "", "second undo restores the initial empty value");

  dispatchHistoryKey(true);
  t.equal(editor.textarea.value, "a", "redo re-applies the change");
});
