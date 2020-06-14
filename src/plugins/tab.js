import isKey from "./isKey.js";

const tab = (tabCharacter = "  ") => (textareaProps, event) => {
  const { value, selectionStart, selectionEnd } = textareaProps;

  if (event.type !== "keydown") {
    return;
  }

  if (isKey("shift+tab", event)) {
    event.preventDefault();
    const linesBeforeCaret = value.substring(0, selectionStart).split("\n");
    const startLine = linesBeforeCaret.length - 1;
    const endLine = value.substring(0, selectionEnd).split("\n").length - 1;
    const nextValue = value
      .split("\n")
      .map((line, i) => {
        if (i >= startLine && i <= endLine && line.startsWith(tabCharacter)) {
          return line.substring(tabCharacter.length);
        }

        return line;
      })
      .join("\n");

    if (value !== nextValue) {
      const startLineText = linesBeforeCaret[startLine];

      return {
        value: nextValue,
        // Move the start cursor if first line in selection was modified
        // It was modified only if it started with a tab
        selectionStart: startLineText.startsWith(tabCharacter)
          ? selectionStart - tabCharacter.length
          : selectionStart,
        // Move the end cursor by total number of characters removed
        selectionEnd: selectionEnd - (value.length - nextValue.length),
      };
    }

    return;
  }

  if (isKey("tab", event)) {
    event.preventDefault();
    if (selectionStart === selectionEnd) {
      const updatedSelection = selectionStart + tabCharacter.length;
      const newValue =
        value.substring(0, selectionStart) +
        tabCharacter +
        value.substring(selectionEnd);

      return {
        value: newValue,
        selectionStart: updatedSelection,
        selectionEnd: updatedSelection,
      };
    }

    const linesBeforeCaret = value.substring(0, selectionStart).split("\n");
    const startLine = linesBeforeCaret.length - 1;
    const endLine = value.substring(0, selectionEnd).split("\n").length - 1;

    return {
      value: value
        .split("\n")
        .map((line, i) => {
          if (i >= startLine && i <= endLine) {
            return tabCharacter + line;
          }

          return line;
        })
        .join("\n"),
      selectionStart: selectionStart + tabCharacter.length,
      selectionEnd:
        selectionEnd + tabCharacter.length * (endLine - startLine + 1),
    };
  }
};

export default tab;
