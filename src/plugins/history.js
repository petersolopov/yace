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

  const shouldRecord = (record) => {
    return (
      stack[activeIndex].value !== record.value ||
      stack[activeIndex].selectionStart !== record.selectionStart ||
      stack[activeIndex].selectionEnd !== record.selectionEnd
    );
  };

  return (textareaProps, event) => {
    if (event.type === "keydown") {
      if (isKey("ctrl/cmd+z", event)) {
        event.preventDefault();

        if (activeIndex !== null) {
          // after applying all plugins it can be new props
          if (shouldRecord(textareaProps)) {
            stack.push(textareaProps);
            activeIndex++;
          }

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

      if (shouldRecord(textareaProps)) {
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
