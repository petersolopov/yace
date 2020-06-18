import isKey from "./isKey.js";

const preserveIndent = () => (textareaProps, event) => {
  const { value, selectionStart, selectionEnd } = textareaProps;

  if (!isKey("enter", event)) {
    return;
  }

  if (event.type !== "keydown") {
    return;
  }

  const currentLineNumber =
    value.substring(0, selectionStart).split("\n").length - 1;

  const lines = value.split("\n");
  const currentLine = lines[currentLineNumber];
  const matches = /^\s+/.exec(currentLine);

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
