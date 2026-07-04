import type { Plugin } from "../index.ts";
import isKey from "./isKey.ts";

// when a selection ends at column 0 the line under that caret is not part of
// the selection, so the range must end on the previous line
function lastSelectedLine(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): number {
  const isLineBoundaryEnd =
    selectionEnd > selectionStart && value[selectionEnd - 1] === "\n";
  const effectiveEnd = isLineBoundaryEnd ? selectionEnd - 1 : selectionEnd;
  return value.substring(0, effectiveEnd).split("\n").length - 1;
}

const tab =
  (tabCharacter = "  "): Plugin =>
  (textareaProps, event): ReturnType<Plugin> => {
    const { value, selectionStart, selectionEnd } = textareaProps;

    if (event.type !== "keydown") {
      return;
    }

    if (isKey("shift+tab", event as KeyboardEvent)) {
      event.preventDefault();
      const lines = value.split("\n");
      const linesBeforeCaret = value.substring(0, selectionStart).split("\n");
      const startLine = linesBeforeCaret.length - 1;
      const endLine = lastSelectedLine(value, selectionStart, selectionEnd);
      const nextValue = lines
        .map((line, i) => {
          if (i >= startLine && i <= endLine && line.startsWith(tabCharacter)) {
            return line.substring(tabCharacter.length);
          }

          return line;
        })
        .join("\n");

      if (value === nextValue) {
        return;
      }

      // a caret can sit inside the removed indent, so each edge moves only by
      // the characters removed before it, not by the full tab width
      const startColumn = linesBeforeCaret[startLine].length;
      const removedBeforeStart = lines[startLine].startsWith(tabCharacter)
        ? Math.min(startColumn, tabCharacter.length)
        : 0;

      const linesBeforeEnd = value.substring(0, selectionEnd).split("\n");
      const endPhysicalLine = linesBeforeEnd.length - 1;
      const endColumn = linesBeforeEnd[endPhysicalLine].length;
      const endLineOutdented =
        endPhysicalLine <= endLine &&
        lines[endPhysicalLine].startsWith(tabCharacter);
      const removedAfterEnd = endLineOutdented
        ? Math.max(0, tabCharacter.length - endColumn)
        : 0;

      return {
        value: nextValue,
        selectionStart: selectionStart - removedBeforeStart,
        selectionEnd:
          selectionEnd - (value.length - nextValue.length) + removedAfterEnd,
      };
    }

    if (isKey("tab", event as KeyboardEvent)) {
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
      const endLine = lastSelectedLine(value, selectionStart, selectionEnd);

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
