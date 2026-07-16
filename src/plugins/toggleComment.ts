import type { Plugin } from "../index.ts";
import { isKey } from "./isKey.ts";

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

export const toggleComment =
  (prefix = "// ", predicate?: (event: KeyboardEvent) => boolean): Plugin =>
  (props, event): ReturnType<Plugin> => {
    if (event.type !== "keydown") {
      return;
    }

    const triggered = predicate
      ? predicate
      : (keyEvent: KeyboardEvent) => isKey("ctrl/cmd+/", keyEvent);
    if (!triggered(event as KeyboardEvent)) {
      return;
    }

    // consume a matched shortcut even on blank ranges so it never falls through to the browser
    event.preventDefault();

    const { value, selectionStart, selectionEnd } = props;
    const lines = value.split("\n");
    const startLine = value.substring(0, selectionStart).split("\n").length - 1;
    const endLine = lastSelectedLine(value, selectionStart, selectionEnd);

    // tolerant uncomment: a line counts as commented when it starts with the
    // prefix or the prefix minus its single trailing space ("//x" with "// ")
    const bare = prefix.endsWith(" ") ? prefix.slice(0, -1) : prefix;
    const matchedForm = (content: string): string | null => {
      if (content.startsWith(prefix)) {
        return prefix;
      }
      if (content.startsWith(bare)) {
        return bare;
      }
      return null;
    };

    let hasNonBlank = false;
    let allCommented = true;
    for (let i = startLine; i <= endLine; i++) {
      const line = lines[i];
      if (/^\s*$/.test(line)) {
        continue;
      }
      hasNonBlank = true;
      if (matchedForm(line.trimStart()) == null) {
        allCommented = false;
      }
    }

    if (!hasNonBlank) {
      return;
    }

    const edits: { at: number; len: number; remove: boolean }[] = [];
    const nextLines: string[] = [];
    let offset = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const inRange = i >= startLine && i <= endLine && !/^\s*$/.test(line);
      if (!inRange) {
        nextLines.push(line);
        offset += line.length + 1;
        continue;
      }

      const indent = line.length - line.trimStart().length;
      const content = line.slice(indent);
      const at = offset + indent;
      if (allCommented) {
        // safe: remove mode is entered only when every non-blank line matched
        const form = matchedForm(content) as string;
        nextLines.push(line.slice(0, indent) + content.slice(form.length));
        edits.push({ at, len: form.length, remove: true });
      } else {
        nextLines.push(line.slice(0, indent) + prefix + content);
        edits.push({ at, len: prefix.length, remove: false });
      }
      offset += line.length + 1;
    }

    // map an absolute edge through the per-line edits: an insertion at or before
    // the edge pushes it right by the whole prefix; a removal pulls it left by
    // the overlap, so an edge inside a removed prefix clamps to the prefix start
    const mapEdge = (pos: number): number => {
      let mapped = pos;
      for (const edit of edits) {
        if (edit.remove) {
          mapped -= Math.min(edit.len, Math.max(0, pos - edit.at));
        } else if (edit.at <= pos) {
          mapped += edit.len;
        }
      }
      return mapped;
    };

    return {
      value: nextLines.join("\n"),
      selectionStart: mapEdge(selectionStart),
      selectionEnd: mapEdge(selectionEnd),
    };
  };
