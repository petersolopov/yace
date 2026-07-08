// keyframed effects cannot live in inline styles; each highlighter injects its
// stylesheet once per document, keyed by element id
export const injectStyles = (id: string, css: string): void => {
  if (typeof document === "undefined" || !document.head) {
    return;
  }

  if (document.getElementById(id)) {
    return;
  }

  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
};
