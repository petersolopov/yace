import type { Plugin } from "../index.ts";
import isKey from "./isKey.ts";

const cutLine =
  (predicate?: (event: KeyboardEvent) => boolean): Plugin =>
  (textareaProps, event): ReturnType<Plugin> => {
    if (event.type !== "keydown") {
      return;
    }

    const predicateFn = predicate
      ? predicate
      : (event: KeyboardEvent) => isKey("ctrl/cmd+x", event);

    if (!predicateFn(event as KeyboardEvent)) {
      return;
    }

    // without the Clipboard API (insecure context) a cut would delete text
    // while the copy silently fails — leave the event to the browser instead
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    event.preventDefault();

    const { value, selectionStart, selectionEnd } = textareaProps;

    if (selectionEnd !== selectionStart) {
      const newValue =
        value.substring(0, selectionStart) + value.substring(selectionEnd);

      navigator.clipboard
        .writeText(value.substring(selectionStart, selectionEnd))
        .catch(() => {}); // prevent any clipboard error. useful for iframe

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

    navigator.clipboard
      .writeText(value.split("\n")[currentLineNumber])
      .catch(() => {}); // prevent any clipboard error. useful for iframe

    // start of the line that replaced the cut one; on the first line there is
    // no preceding newline, and cutting the last line clamps to the new end
    const caret = Math.min(
      linesBeforeCaret.length ? linesBeforeCaret.join("\n").length + 1 : 0,
      newValue.length,
    );

    return {
      value: newValue,
      selectionStart: caret,
      selectionEnd: caret,
    };
  };

export default cutLine;
