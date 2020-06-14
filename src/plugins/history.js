import isKey from "./isKey.js";

function history() {
  let stack = [];
  let activeIndex = null;

  const initHistory = (record) => {
    activeIndex = 0;
    stack.push(record);
  };

  const rewriteHistory = (record) => {
    stack = stack.slice(0, activeIndex + 1);
    stack.push(record);
    activeIndex = stack.length - 1;
  };

  return (textareaProps, event) => {
    if (event.type === "keydown") {
      if (isKey("ctrl/cmd+z", event)) {
        event.preventDefault();

        if (activeIndex !== null) {
          const newActiveIndex = Math.max(0, activeIndex - 1);
          activeIndex = newActiveIndex;
          return stack[newActiveIndex];
        }
      }

      if (isKey("ctrl/cmd+shift+z", event)) {
        event.preventDefault();

        if (activeIndex !== null) {
          const newActiveIndex = Math.min(stack.length - 1, activeIndex + 1);
          activeIndex = newActiveIndex;
          return stack[newActiveIndex];
        }
      }

      if (activeIndex === null) {
        initHistory(textareaProps);
        return;
      }

      if (
        stack[activeIndex].value !== textareaProps.value ||
        stack[activeIndex].selectionStart !== textareaProps.selectionStart ||
        stack[activeIndex].selectionEnd !== textareaProps.selectionEnd
      ) {
        rewriteHistory(textareaProps);
        return;
      }
    }

    if (event.type === "input") {
      if (activeIndex === null) {
        initHistory(textareaProps);
      } else {
        rewriteHistory(textareaProps);
      }
    }
  };
}

export default history;
