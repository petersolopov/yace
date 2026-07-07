export const rootStyles = {
  position: "relative",
  boxSizing: "border-box",
  overflow: "hidden",
  fontSize: "16px",
  fontFamily:
    'Menlo, Consolas, "Liberation Mono", Monaco, "Lucida Console", monospace',
};

export const textareaStyles = {
  lineHeight: "inherit",
  whiteSpace: "pre-wrap",
  wordBreak: "keep-all",
  // wrap parity with the pre layer must not depend on the UA default
  overflowWrap: "break-word",
  background: "none",
  position: "absolute",
  width: "100%",
  height: "100%",
  zIndex: "1",
  resize: "none",
  // not "auto": with transparent text-fill the UA may derive an invisible caret
  caretColor: "currentColor",
  padding: "inherit",
  outline: "none",
  fontSize: "inherit",
  fontFamily: "inherit",
  // form controls do not inherit letter-spacing by UA default, so a spaced
  // root would misalign the caret against the pre glyph by glyph
  letterSpacing: "inherit",
  boxSizing: "border-box",
  border: "none",
  top: "0px",
  left: "0px",
  color: "inherit",
  overflow: "hidden",
  "-webkit-font-smoothing": "antialiased",
  "-webkit-text-fill-color": "transparent",
};

export const preStyles = {
  lineHeight: "inherit",
  position: "relative",
  whiteSpace: "pre-wrap",
  wordBreak: "keep-all",
  padding: "0",
  width: "100%",
  margin: "0",
  pointerEvents: "none",
  boxSizing: "border-box",
  overflowWrap: "break-word",
  fontFamily: "inherit",
};

export const linesStyles = {
  lineHeight: "inherit",
  position: "absolute",
  width: "100%",
  height: "100%",
  whiteSpace: "pre-wrap",
  wordBreak: "keep-all",
  padding: "inherit",
  margin: "0",
  top: "0px",
  left: "0px",
  pointerEvents: "none",
  boxSizing: "border-box",
  overflowWrap: "break-word",
  fontFamily: "inherit",
};
