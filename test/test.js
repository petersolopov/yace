import { test } from "zora";
import "undom/register.js";

import Yace from "../src/index.js";

// mock querySelector for yace and return mocked editor element
document.querySelector = () => document.createElement("div");

// helpers
function dispatchTextareaEvent(textarea, value, type = "input") {
  textarea.value = value;
  textarea.dispatchEvent({ type });
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

test(".destroy()", (t) => {
  const editor = new Yace("#editor");
  editor.destroy();

  t.notOk(editor.textarea.__handlers.input.length, "input handler should be destroyed");
  t.notOk(editor.textarea.__handlers.keydown.length, "keydown handler should be destroyed");
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
