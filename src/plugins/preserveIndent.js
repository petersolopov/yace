import isKey from "./isKey.js";

const preserveIndent = () => (textareaProps, event) => {
  const { value, selectionStart, selectionEnd } = textareaProps;

  if (!isKey("enter", event)) {
    return;
  }

  if (event.type !== "keydown") {
    return;
  }

  // indent from the part of the line before the caret, otherwise the indent
  // left after the caret is carried to the new line and doubles it
  const currentLineBeforeCaret = value
    .substring(0, selectionStart)
    .split("\n")
    .pop();
  const matches = /^\s+/.exec(currentLineBeforeCaret);

  if (!matches) {
    return;
  }

  event.preventDefault();
  const indent = matches[0];
  const newLine = "\n";

  const inserted = newLine + indent;

  const newValue =
    value.substring(0, selectionStart) +
    inserted +
    value.substring(selectionEnd);

  return {
    value: newValue,
    selectionStart: selectionStart + inserted.length,
    selectionEnd: selectionStart + inserted.length,
  };
};

export default preserveIndent;
