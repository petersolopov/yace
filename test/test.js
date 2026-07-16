import { test } from "node:test";
import assert from "node:assert";
import "undom/register.js";

import { Yace } from "../src/index.ts";
import { preserveIndent } from "../src/plugins/preserveIndent.ts";
import { isKey } from "../src/plugins/isKey.ts";
import { tab } from "../src/plugins/tab.ts";
import { cutLine } from "../src/plugins/cutLine.ts";
import { autoClose } from "../src/plugins/autoClose.ts";
import { toggleComment } from "../src/plugins/toggleComment.ts";
import { history } from "../src/plugins/history.ts";
import {
  tab as tabBarrel,
  history as historyBarrel,
  preserveIndent as preserveIndentBarrel,
  cutLine as cutLineBarrel,
  autoClose as autoCloseBarrel,
  toggleComment as toggleCommentBarrel,
  isKey as isKeyBarrel,
} from "../src/plugins/index.ts";

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
  editor.textarea.dispatchEvent({ type: "keydown", key: "Enter", preventDefault() {} });
}

test("plugins barrel re-exports every plugin, identical to its deep subpath", () => {
  const pairs = [
    ["tab", tab, tabBarrel],
    ["history", history, historyBarrel],
    ["preserveIndent", preserveIndent, preserveIndentBarrel],
    ["cutLine", cutLine, cutLineBarrel],
    ["autoClose", autoClose, autoCloseBarrel],
    ["toggleComment", toggleComment, toggleCommentBarrel],
    ["isKey", isKey, isKeyBarrel],
  ];

  for (const [name, deep, barrel] of pairs) {
    assert.strictEqual(typeof barrel, "function", `${name} barrel export is callable`);
    assert.strictEqual(barrel, deep, `${name} barrel export === its deep subpath`);
  }
});

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

test(".updateOptions() replaces the highlighters and re-renders", () => {
  const editor = new Yace("#editor", { value: "abc" });

  editor.updateOptions({ highlighters: [(value) => value.toUpperCase()] });

  assert.deepStrictEqual(editor.pre.innerHTML, "ABC<br/>", "new highlighters should re-render the current value");
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

  const firstLineNumber = lineNumbersElement.innerHTML.split("\n")[0];
  assert.ok(firstLineNumber.includes("text-align: right"), "line numbers should be right-aligned");
  assert.ok(
    firstLineNumber.includes("width: 2ch"),
    "line-number width should reserve the digit columns without the gap ch",
  );
});

test("options.highlighters", () => {
  const editor = new Yace("#editor", {
    value: "test",
    highlighters: [(value) => value.toUpperCase()],
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

test("array highlighter composes stages, raw first then html-aware", () => {
  const seen = [];
  const stage0 = (value, context) => {
    seen.push(context);
    return value + "|0";
  };
  const stage1 = (value, context) => {
    seen.push(context);
    return value + "|1";
  };

  const editor = new Yace("#editor", { value: "x", highlighters: [stage0, stage1] });

  assert.deepStrictEqual(editor.pre.innerHTML, "x|0|1<br/>", "each stage feeds the next, in order");
  assert.deepStrictEqual(
    seen,
    [{ html: false }, { html: true }],
    "stage 0 gets html:false (raw code), later stages get html:true (prior HTML)",
  );
});

test(".updateOptions() accepts a highlighters array", () => {
  const editor = new Yace("#editor", { value: "x" });

  const a = (value) => value + "|a";
  const b = (value, context) => value + (context.html ? "|htmlB" : "|rawB");
  editor.updateOptions({ highlighters: [a, b] });

  assert.deepStrictEqual(
    editor.pre.innerHTML,
    "x|a|htmlB<br/>",
    "the array normalizes on updateOptions and re-renders",
  );
});

test("a bare function is tolerated where the typed option wants an array", () => {
  // the documented option is Highlighter[]; JS callers may still pass one
  // function and the runtime wraps it — same result as a single-element array
  const editor = new Yace("#editor", { value: "abc", highlighters: (value) => value.toUpperCase() });
  assert.deepStrictEqual(editor.pre.innerHTML, "ABC<br/>", "the lone function runs as stage 0");

  editor.updateOptions({ highlighters: (value) => `[${value}]` });
  assert.deepStrictEqual(editor.pre.innerHTML, "[abc]<br/>", "updateOptions wraps a bare function too");
});

test("an empty highlighter array falls back to escaping, not identity", () => {
  const editor = new Yace("#editor", {
    value: "<img src=x onerror=alert(1)>",
    highlighters: [],
  });

  assert.ok(!editor.pre.innerHTML.includes("<img"), "the payload is not passed through raw");
  assert.deepStrictEqual(
    editor.pre.innerHTML,
    "&lt;img src=x onerror=alert(1)&gt;<br/>",
    "an empty pipeline escapes like the default highlighter",
  );
});

test(".updateOptions() with an empty highlighters array resets to the escaping default", () => {
  const editor = new Yace("#editor", {
    value: "<b>",
    highlighters: [(value) => value],
  });
  assert.deepStrictEqual(editor.pre.innerHTML, "<b><br/>", "the identity highlighter leaves the value raw");

  editor.updateOptions({ highlighters: [] });
  assert.deepStrictEqual(
    editor.pre.innerHTML,
    "&lt;b&gt;<br/>",
    "an empty array on updateOptions falls back to escaping, not identity",
  );
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

test("readonly textarea skips the keydown plugin pipeline", () => {
  let called = false;
  const plugin = () => {
    called = true;
    return { value: "changed" };
  };
  const editor = new Yace("#editor", {
    value: "original",
    plugins: [plugin],
  });
  editor.textarea.readOnly = true;

  editor.textarea.dispatchEvent({ type: "keydown", key: "a" });

  assert.ok(!called, "readonly keydown should not reach plugins");
  assert.deepStrictEqual(editor.textarea.value, "original", "readonly keydown should not change the value");
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
  assert.ok(isKey("enter", { key: "Enter" }), "matches a named key case-insensitively");
  assert.ok(!isKey("enter", { key: "a" }), "does not match a different key");
  assert.ok(isKey("a", { key: "a" }), "matches a letter by key");
  assert.ok(isKey("ctrl/cmd+z", { key: "z", ctrlKey: true }), "matches a modifier combo");
  assert.ok(!isKey("ctrl/cmd+z", { key: "z" }), "does not match when the required modifier is absent");
  assert.ok(isKey("shift", { shiftKey: true }), "matches a modifier-only combo");
});

test("plugins/isKey: edge cases", () => {
  assert.ok(
    !isKey("enter", { key: "Enter", shiftKey: true }),
    "an unexpected modifier rejects an otherwise matching key",
  );
  assert.ok(isKey("escape", { key: "Escape" }), "matches escape by name");
  assert.ok(
    isKey("ctrl/cmd+shift+z", { key: "Z", ctrlKey: true, shiftKey: true }),
    "a shifted uppercase key still matches",
  );
  assert.ok(
    isKey("ctrl/cmd+z", { key: "я", code: "KeyZ", ctrlKey: true }),
    "falls back to the physical code on a non-latin layout",
  );
  assert.ok(isKey("1", { key: "!", code: "Digit1" }), "falls back to the physical code for digits");
  assert.ok(!isKey("a", { key: "b", code: "KeyB" }), "rejects when neither key nor code match");
  assert.ok(!isKey("enter", {}), "an event without key data does not match");
  assert.ok(isKey("add", { key: "=" }), "resolves the add alias");
  assert.ok(isKey("ctrl+y", { key: "y", ctrlKey: true }), "resolves the ctrl modifier alias");
  assert.ok(
    isKey("shift+/", { key: "?", code: "Slash", shiftKey: true }),
    "matches shifted punctuation by physical code",
  );
  assert.ok(
    !isKey("ctrl/cmd+z", { key: "Process", code: "KeyZ", ctrlKey: true, isComposing: true }),
    "the code fallback must not match composition keydowns",
  );
});

const tabKey = () => {
  const event = {
    type: "keydown",
    key: "Tab",
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
    key: "Tab",
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
    key: "Enter",
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
    plugin({ value: "ab", selectionStart: 1, selectionEnd: 1 }, { type: "input", key: "Tab" }),
    undefined,
    "non-keydown event should be a no-op",
  );

  assert.deepStrictEqual(
    plugin({ value: "ab", selectionStart: 1, selectionEnd: 1 }, { type: "keydown", key: "a", preventDefault() {} }),
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
    key: "x",
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
      { type: "keydown", key: "a", ctrlKey: true, preventDefault() {} },
    ),
    undefined,
    "non-matching key should be a no-op",
  );

  assert.deepStrictEqual(
    plugin({ value: "aa", selectionStart: 0, selectionEnd: 0 }, { type: "input" }),
    undefined,
    "non-keydown event should be a no-op",
  );

  const customPlugin = cutLine((event) => event.key === "k");
  assert.deepStrictEqual(
    customPlugin(
      { value: "aa\nbb", selectionStart: 0, selectionEnd: 0 },
      { type: "keydown", key: "k", preventDefault() {} },
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
  editor.textarea.dispatchEvent({ type: "keydown", key: "a", preventDefault() {} });
  assert.deepStrictEqual(editor.textarea.value, "  abc", "non-enter keydown should be a no-op");

  editor.textarea.value = "  abc";
  editor.textarea.dispatchEvent({ type: "input", key: "Enter", preventDefault() {} });
  assert.deepStrictEqual(editor.textarea.value, "  abc", "enter on input event should be a no-op");
});

const props = (value, caret = value.length) => ({
  value,
  selectionStart: caret,
  selectionEnd: caret,
});

const typeKey = () => ({ type: "keydown", key: "a", preventDefault() {} });

const undoKey = () => {
  const event = {
    type: "keydown",
    key: "z",
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
    key: "z",
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

test("plugins/history: ctrl+y redoes", () => {
  const plugin = history();
  const ctrlYKey = () => {
    const event = {
      type: "keydown",
      key: "y",
      ctrlKey: true,
      defaultPrevented: false,
      preventDefault() {
        event.defaultPrevented = true;
      },
    };
    return event;
  };
  const A = props("");
  const B = props("a");

  plugin(A, typeKey());
  plugin(B, inputAt(100));
  assert.deepStrictEqual(plugin(B, undoKey()), A, "undo returns the previous state");

  const event = ctrlYKey();
  assert.deepStrictEqual(plugin(A, event), B, "ctrl+y redoes");
  assert.ok(event.defaultPrevented, "ctrl+y must block the native browser redo");
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
    editor.textarea.dispatchEvent({ type: "keydown", key: "a", timeStamp, preventDefault() {} });
    setCaret(next);
    editor.textarea.dispatchEvent({ type: "input", timeStamp });
  };
  const dispatchHistoryKey = (shiftKey) => {
    editor.textarea.dispatchEvent({
      type: "keydown",
      key: "z",
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

const sel = (value, selectionStart, selectionEnd) => ({ value, selectionStart, selectionEnd });

const bracketKey = (key, mods = {}) => {
  const event = {
    type: "keydown",
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
    ...mods,
  };
  return event;
};

test("plugins/autoClose: inserts a matching pair with the caret inside", () => {
  const plugin = autoClose();

  assert.deepStrictEqual(
    plugin(props("", 0), bracketKey("(")),
    { value: "()", selectionStart: 1, selectionEnd: 1 },
    "an opening paren inserts its close with the caret between",
  );

  assert.deepStrictEqual(
    plugin(props("ab", 1), bracketKey("[")),
    { value: "a[]b", selectionStart: 2, selectionEnd: 2 },
    "a bracket inserts mid-value and keeps the caret inside",
  );

  assert.deepStrictEqual(
    plugin(props("", 0), bracketKey("{")),
    { value: "{}", selectionStart: 1, selectionEnd: 1 },
    "a brace inserts its close too",
  );

  const insert = bracketKey("(");
  plugin(props("", 0), insert);
  assert.ok(insert.defaultPrevented, "insert should preventDefault so the browser does not double-type");
});

test("plugins/autoClose: wrapping a selection keeps it selected", () => {
  const plugin = autoClose();

  assert.deepStrictEqual(
    plugin(sel("abc", 0, 3), bracketKey("(")),
    { value: "(abc)", selectionStart: 1, selectionEnd: 4 },
    "typing an open char around a selection wraps it and keeps it selected",
  );
});

test("plugins/autoClose: skip-over steps past a typed closing char", () => {
  const plugin = autoClose();

  const skip = bracketKey(")");
  assert.deepStrictEqual(
    plugin(props("()", 1), skip),
    { value: "()", selectionStart: 2, selectionEnd: 2 },
    "typing the close char right before its match advances the caret without inserting",
  );
  assert.ok(skip.defaultPrevented, "skip-over should preventDefault so the browser does not insert the char");

  assert.deepStrictEqual(
    plugin(props("()", 2), bracketKey(")")),
    undefined,
    "a close char with no matching char ahead is left to the browser",
  );

  const overSelection = bracketKey(")");
  assert.deepStrictEqual(
    plugin(sel("(ab)", 1, 3), overSelection),
    undefined,
    "a close char typed over a selection is not skip-over handled",
  );
  assert.ok(!overSelection.defaultPrevented, "a close char over a selection is left to the browser");
});

test("plugins/autoClose: backspace inside an empty pair deletes both", () => {
  const plugin = autoClose();

  const back = bracketKey("Backspace");
  assert.deepStrictEqual(
    plugin(props("()", 1), back),
    { value: "", selectionStart: 0, selectionEnd: 0 },
    "backspace between an empty pair removes both characters",
  );
  assert.ok(back.defaultPrevented, "backspace-pair should preventDefault");

  assert.deepStrictEqual(
    plugin(props("()", 0), bracketKey("Backspace")),
    undefined,
    "backspace at position 0 has no pair to remove",
  );

  assert.deepStrictEqual(
    plugin(props("ab", 1), bracketKey("Backspace")),
    undefined,
    "backspace after a non-open char is left to the browser",
  );

  assert.deepStrictEqual(
    plugin(props("(x", 1), bracketKey("Backspace")),
    undefined,
    "backspace after an open char whose close is missing is left to the browser",
  );

  assert.deepStrictEqual(
    plugin(sel("()", 0, 2), bracketKey("Backspace")),
    undefined,
    "backspace with a selection deletes it natively, not the pair",
  );
});

test("plugins/autoClose: foreign keys and non-keydown events are ignored", () => {
  const plugin = autoClose();

  assert.deepStrictEqual(plugin(props("ab", 1), bracketKey("a")), undefined, "a non-pair key is left untouched");

  assert.deepStrictEqual(
    plugin(props("", 0), { type: "input", key: "(" }),
    undefined,
    "autoClose only runs on keydown",
  );
});

test("plugins/autoClose: command and control chords are not hijacked", () => {
  const plugin = autoClose();

  const cmdBracket = bracketKey("[", { metaKey: true });
  assert.deepStrictEqual(plugin(props("", 0), cmdBracket), undefined, "cmd+[ (browser back) must not auto-close");
  assert.ok(!cmdBracket.defaultPrevented, "cmd+[ is left to the browser");

  const ctrlShift9 = bracketKey("(", { ctrlKey: true, shiftKey: true });
  assert.deepStrictEqual(
    plugin(props("", 0), ctrlShift9),
    undefined,
    "ctrl+shift+9 types '(' but the chord must not auto-close",
  );
  assert.ok(!ctrlShift9.defaultPrevented, "ctrl+shift+9 is left to the browser");

  assert.deepStrictEqual(
    plugin(props("", 0), bracketKey("[", { ctrlKey: true, altKey: true })),
    { value: "[]", selectionStart: 1, selectionEnd: 1 },
    "AltGr reports ctrl+alt while typing a bracket and must still auto-close",
  );
});

test("plugins/autoClose: quotes are opt-in via the option, not in the default pairs", () => {
  const plugin = autoClose();
  const quote = bracketKey('"');
  assert.deepStrictEqual(
    plugin(props("", 0), quote),
    undefined,
    "typing a quote with the default config inserts nothing",
  );
  assert.ok(!quote.defaultPrevented, "a quote with the default config is left to the browser");

  const quotes = autoClose({ '"': '"' });
  assert.deepStrictEqual(
    quotes(props("", 0), bracketKey('"')),
    { value: '""', selectionStart: 1, selectionEnd: 1 },
    "a symmetric pair added via the option inserts once with the caret inside",
  );

  assert.deepStrictEqual(
    quotes(props('""', 1), bracketKey('"')),
    { value: '""', selectionStart: 2, selectionEnd: 2 },
    "typing the same char before its match steps over instead of inserting again",
  );
});

test("plugins/autoClose: a readonly textarea is never edited", () => {
  const editor = new Yace("#editor", { plugins: [autoClose()] });
  editor.textarea.readOnly = true;
  const event = bracketKey("(");

  editor.textarea.dispatchEvent(event);

  assert.deepStrictEqual(editor.textarea.value, "", "typing into a readonly textarea inserts nothing");
  assert.ok(!event.defaultPrevented, "a readonly textarea leaves the event to the browser");
});

test("plugins/autoClose: a pair insertion is a single undo step with history()", () => {
  const editor = new Yace("#editor", { plugins: [history(), autoClose()] });

  editor.textarea.value = "";
  editor.textarea.selectionStart = 0;
  editor.textarea.selectionEnd = 0;
  editor.textarea.dispatchEvent({ type: "keydown", key: "(", timeStamp: 1000, preventDefault() {} });

  assert.deepStrictEqual(editor.textarea.value, "()", "typing '(' inserts the pair on keydown");

  editor.textarea.dispatchEvent({ type: "keydown", key: "z", ctrlKey: true, timeStamp: 2000, preventDefault() {} });
  assert.deepStrictEqual(editor.textarea.value, "", "one undo removes both inserted characters");
});

const slashKey = (mods = {}) => {
  const event = {
    type: "keydown",
    key: "/",
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
    ...mods,
  };
  return event;
};

test("plugins/toggleComment: comments and uncomments a single line", () => {
  const plugin = toggleComment();

  const comment = slashKey();
  assert.deepStrictEqual(
    plugin(props("const x = 1;"), comment),
    { value: "// const x = 1;", selectionStart: 15, selectionEnd: 15 },
    "toggling a line inserts the prefix and shifts the caret past it",
  );
  assert.ok(comment.defaultPrevented, "a matched toggle suppresses the browser default");

  assert.deepStrictEqual(
    plugin(props("// const x = 1;"), slashKey()),
    { value: "const x = 1;", selectionStart: 12, selectionEnd: 12 },
    "toggling a commented line removes the prefix",
  );
});

test("plugins/toggleComment: comments every line a selection touches", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(sel("a\nb\nc", 0, 5), slashKey()),
    { value: "// a\n// b\n// c", selectionStart: 3, selectionEnd: 14 },
    "a full selection comments all lines uniformly",
  );

  assert.deepStrictEqual(
    plugin(sel("a\nb\nc", 0, 2), slashKey()),
    { value: "// a\nb\nc", selectionStart: 3, selectionEnd: 5 },
    "a selection ending at column 0 excludes that line but the end still shifts",
  );
});

test("plugins/toggleComment: uncomments every line of a fully-commented selection", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(sel("// a\n// b", 0, 8), slashKey()),
    { value: "a\nb", selectionStart: 0, selectionEnd: 2 },
    "a range where every non-blank line is commented uncomments all of them",
  );
});

test("plugins/toggleComment: a mixed range comments all lines, doubling the commented one", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(sel("// a\nb", 0, 6), slashKey()),
    { value: "// // a\n// b", selectionStart: 3, selectionEnd: 12 },
    "a mixed range comments uniformly; the already-commented line gets a second prefix",
  );

  assert.deepStrictEqual(
    plugin(sel("// // a\n// b", 3, 12), slashKey()),
    { value: "// a\nb", selectionStart: 0, selectionEnd: 6 },
    "toggling the doubled range back round-trips to the original text and selection",
  );
});

test("plugins/toggleComment: uncomment is tolerant of a missing space after the prefix", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(props("//x"), slashKey()),
    { value: "x", selectionStart: 1, selectionEnd: 1 },
    "'//x' counts as commented and uncomments cleanly",
  );
});

test("plugins/toggleComment: blank and whitespace-only lines are skipped", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(sel("a\n\n  \nb", 0, 7), slashKey()),
    { value: "// a\n\n  \n// b", selectionStart: 3, selectionEnd: 13 },
    "only non-blank lines get the prefix; empty and whitespace-only lines are untouched",
  );
});

test("plugins/toggleComment: an all-blank range is a no-op but still preventDefaults", () => {
  const plugin = toggleComment();

  const event = slashKey();
  assert.deepStrictEqual(plugin(sel("\n  \n", 0, 4), event), undefined, "a range with no non-blank line makes no edit");
  assert.ok(event.defaultPrevented, "the matched hotkey still suppresses the browser default");
});

test("plugins/toggleComment: preserves indentation, inserting after leading whitespace", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(props("    code"), slashKey()),
    { value: "    // code", selectionStart: 11, selectionEnd: 11 },
    "the prefix goes before the first non-whitespace char, keeping spaces",
  );

  assert.deepStrictEqual(
    plugin(props("\t\tcode"), slashKey()),
    { value: "\t\t// code", selectionStart: 9, selectionEnd: 9 },
    "tab indentation is preserved too",
  );
});

test("plugins/toggleComment: honors a custom prefix", () => {
  const plugin = toggleComment("# ");

  assert.deepStrictEqual(
    plugin(props("x = 1"), slashKey()),
    { value: "# x = 1", selectionStart: 7, selectionEnd: 7 },
    "a custom prefix is inserted",
  );

  assert.deepStrictEqual(
    plugin(props("# x = 1"), slashKey()),
    { value: "x = 1", selectionStart: 5, selectionEnd: 5 },
    "and removed on toggle",
  );
});

test("plugins/toggleComment: a predicate overrides the default trigger", () => {
  const plugin = toggleComment("// ", (event) => event.key === "k");

  const kEvent = {
    type: "keydown",
    key: "k",
    defaultPrevented: false,
    preventDefault() {
      kEvent.defaultPrevented = true;
    },
  };
  assert.deepStrictEqual(
    plugin(props("a"), kEvent),
    { value: "// a", selectionStart: 4, selectionEnd: 4 },
    "the custom predicate fires the toggle on its own key",
  );

  const slash = slashKey();
  assert.deepStrictEqual(
    plugin(props("a"), slash),
    undefined,
    "with a predicate the default ctrl/cmd+/ no longer triggers",
  );
  assert.ok(!slash.defaultPrevented, "a non-matching event is left to the browser");
});

test("plugins/toggleComment: caret in the indent stays before the inserted prefix", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(props("  code", 1), slashKey()),
    { value: "  // code", selectionStart: 1, selectionEnd: 1 },
    "an edge before the insertion point does not move",
  );
});

test("plugins/toggleComment: caret inside a removed prefix clamps to the prefix start", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(props("  // code", 4), slashKey()),
    { value: "  code", selectionStart: 2, selectionEnd: 2 },
    "an edge inside the removed prefix clamps to where the prefix began",
  );
});

test("plugins/toggleComment: matches ctrl/cmd+/ via the physical Slash code", () => {
  const plugin = toggleComment();

  const event = {
    type: "keydown",
    key: "7",
    code: "Slash",
    ctrlKey: true,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };
  assert.deepStrictEqual(
    plugin(props("a"), event),
    { value: "// a", selectionStart: 4, selectionEnd: 4 },
    "a layout where '/' is not the base key still triggers via event.code",
  );
});

test("plugins/toggleComment: ignores non-keydown and non-matching events", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(props("a"), { type: "input", key: "/", ctrlKey: true }),
    undefined,
    "an input event is a no-op",
  );

  assert.deepStrictEqual(
    plugin(props("a"), slashKey({ key: "a", ctrlKey: false })),
    undefined,
    "a keydown that is not ctrl/cmd+/ is a no-op",
  );
});

test("plugins/toggleComment: a readonly textarea is never edited", () => {
  const editor = new Yace("#editor", {
    value: "a",
    plugins: [toggleComment()],
  });
  editor.textarea.readOnly = true;
  const event = slashKey();

  editor.textarea.dispatchEvent(event);

  assert.deepStrictEqual(editor.textarea.value, "a", "a readonly textarea keeps its value");
  assert.ok(!event.defaultPrevented, "a readonly textarea leaves the event to the browser");
});

test("plugins/toggleComment: strips only one trailing space from the tolerant prefix", () => {
  const plugin = toggleComment("//  ");

  assert.deepStrictEqual(
    plugin(props("//x"), slashKey()),
    { value: "//  //x", selectionStart: 7, selectionEnd: 7 },
    "with a two-space prefix the tolerant form is '// ', so '//x' is not commented and gets the prefix",
  );

  assert.deepStrictEqual(
    plugin(props("// x"), slashKey()),
    { value: "x", selectionStart: 1, selectionEnd: 1 },
    "the tolerant form is the prefix minus exactly one trailing space",
  );
});

test("plugins/toggleComment: a prefix without a trailing space has no separate tolerant form", () => {
  const plugin = toggleComment("//");

  assert.deepStrictEqual(
    plugin(props("x"), slashKey()),
    { value: "//x", selectionStart: 3, selectionEnd: 3 },
    "the prefix inserts with no trailing space",
  );

  assert.deepStrictEqual(
    plugin(props("//x"), slashKey()),
    { value: "x", selectionStart: 1, selectionEnd: 1 },
    "and uncomments, with the tolerant form equal to the prefix itself",
  );
});

test("plugins/toggleComment: comments the caret line with the caret at column 0", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(props("a\nb\nc", 0), slashKey()),
    { value: "// a\nb\nc", selectionStart: 3, selectionEnd: 3 },
    "caret at column 0 of the first line comments only that line",
  );

  assert.deepStrictEqual(
    plugin(props("a\nb\nc", 4), slashKey()),
    { value: "a\nb\n// c", selectionStart: 7, selectionEnd: 7 },
    "caret at column 0 of the last line comments only that line",
  );
});

test("plugins/toggleComment: caret inside the tolerant no-space prefix clamps on removal", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(props("//x", 1), slashKey()),
    { value: "x", selectionStart: 0, selectionEnd: 0 },
    "a caret between the two slashes clamps to the prefix start when removed",
  );
});

test("plugins/toggleComment: an uncomment ending at column 0 excludes that line but still shifts", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(sel("// a\n// b", 0, 5), slashKey()),
    { value: "a\n// b", selectionStart: 0, selectionEnd: 2 },
    "the end at column 0 of line 2 is excluded from the uncomment but shifts by line 1's removal",
  );
});

test("plugins/toggleComment: treats a regex-metacharacter prefix literally", () => {
  const plugin = toggleComment("* ");

  assert.deepStrictEqual(
    plugin(props("x"), slashKey()),
    { value: "* x", selectionStart: 3, selectionEnd: 3 },
    "a prefix with regex metacharacters is matched as a literal string",
  );

  assert.deepStrictEqual(
    plugin(props("* x"), slashKey()),
    { value: "x", selectionStart: 1, selectionEnd: 1 },
    "and removed literally on toggle",
  );
});

test("plugins/toggleComment: preserves CRLF line endings through a toggle", () => {
  const plugin = toggleComment();

  const commented = plugin(sel("a\r\nb", 0, 4), slashKey());
  assert.deepStrictEqual(commented.value, "// a\r\n// b", "carriage returns are kept when commenting CRLF content");

  assert.deepStrictEqual(
    plugin(sel(commented.value, 0, commented.value.length), slashKey()).value,
    "a\r\nb",
    "and restored when uncommenting",
  );
});

test("plugins/toggleComment: toggles a whole-line single-line selection", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(sel("abc", 0, 3), slashKey()),
    { value: "// abc", selectionStart: 3, selectionEnd: 6 },
    "a full single-line selection comments the line and keeps the text selected",
  );
});

test("plugins/toggleComment: maps the selection correctly with tab indentation", () => {
  const plugin = toggleComment();

  assert.deepStrictEqual(
    plugin(sel("\tab\n\tcd", 0, 6), slashKey()),
    { value: "\t// ab\n\t// cd", selectionStart: 0, selectionEnd: 12 },
    "an edge before the tab indent stays put; a later edge shifts past both prefixes",
  );
});
