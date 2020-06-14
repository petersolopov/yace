import isKey from "./isKey.js";

const cutLine = (predicate) => (textareaProps, event) => {
  if (event.type !== "keydown") {
    return;
  }

  const predicateFn = predicate
    ? predicate
    : (event) => isKey("ctrl/cmd+x", event);

  if (!predicateFn(event)) {
    return;
  }

  event.preventDefault();

  const { value, selectionStart, selectionEnd } = textareaProps;

  if (selectionEnd !== selectionStart) {
    const newValue =
      value.substring(0, selectionStart) + value.substring(selectionEnd);

    if (navigator && navigator.clipboard) {
      navigator.clipboard
        .writeText(value.substring(selectionStart, selectionEnd))
        .catch(() => {}); // prevent any clipboard error. useful for iframe
    }

    return {
      value: newValue,
      selectionStart: selectionStart,
      selectionEnd: selectionStart,
    };
  }

  const linesBeforeCaret = value
    .substring(0, selectionStart)
    .split("\n")
    .slice(0, -1);

  const currentLineNumber = linesBeforeCaret.length;

  const newValue = value
    .split("\n")
    .map((line, lineNumber) => {
      if (lineNumber === currentLineNumber) {
        return null;
      }

      return line;
    })
    .filter((line) => line != null)
    .join("\n");

  if (navigator && navigator.clipboard) {
    navigator.clipboard
      .writeText(value.split("\n")[currentLineNumber])
      .catch(() => {}); // prevent any clipboard error. useful for iframe
  }

  return {
    value: newValue,

    // move cursor to start next line
    selectionStart: linesBeforeCaret.join("\n").length + 1,
    selectionEnd: linesBeforeCaret.join("\n").length + 1,
  };
};

export default cutLine;
