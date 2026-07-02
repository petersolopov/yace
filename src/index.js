import {
  textareaStyles,
  preStyles,
  rootStyles,
  linesStyles,
} from "./styles.js";

class Yace {
  constructor(selector, options = {}) {
    if (!selector) {
      throw new Error("selector is not defined");
    }

    this.root =
      selector instanceof Node ? selector : document.querySelector(selector);

    if (!this.root) {
      throw new Error(`element with "${selector}" selector is not exist`);
    }

    const defaultOptions = {
      value: "",
      styles: {},
      plugins: [],
      highlighter: (value) => escape(value),
    };

    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.options.value =
      this.options.value == null ? "" : String(this.options.value);

    this.init();
  }

  init() {
    this.textarea = document.createElement("textarea");
    this.textarea.setAttribute("spellcheck", "false");
    this.textarea.setAttribute("autocapitalize", "off");
    this.textarea.setAttribute("autocorrect", "off");
    this.textarea.setAttribute("autocomplete", "off");
    this.pre = document.createElement("pre");

    // snapshot inline styles the editor mutates so destroy() can restore them
    const mutatedStyleKeys = Object.keys(rootStyles)
      .concat(Object.keys(this.options.styles))
      .concat(["paddingLeft"]);
    this.initialRootStyles = {};
    mutatedStyleKeys.forEach((key) => {
      this.initialRootStyles[key] = this.root.style[key] || "";
    });

    Object.assign(this.root.style, rootStyles, this.options.styles);
    Object.assign(this.textarea.style, textareaStyles);
    Object.assign(this.pre.style, preStyles);

    // what the config produced, as opposed to the pre-editor snapshot above:
    // toggling lineNumbers off must return here, not to the destroy() baseline
    this.basePaddingLeft = this.root.style.paddingLeft || "";

    this.root.appendChild(this.textarea);
    this.root.appendChild(this.pre);

    this.addTextareaEvents();
    this.update({ value: this.options.value });
    this.updateLines();
  }

  addTextareaEvents() {
    this.handleEvent = (event) => {
      if (event.isComposing || event.keyCode === 229) {
        return;
      }

      const textareaProps = runPlugins(this.options.plugins, event);
      this.update(textareaProps);
    };

    this.textarea.addEventListener("input", this.handleEvent);
    this.textarea.addEventListener("keydown", this.handleEvent);
    // composition commit must go through the plugin pipeline like any edit;
    // some engines fire the final input before compositionend, so the guard
    // above may have swallowed it
    this.textarea.addEventListener("compositionend", this.handleEvent);
  }

  update(textareaProps) {
    // an async consumer callback can land after destroy (e.g. React unmount)
    if (!this.textarea) {
      return;
    }

    let { value, selectionStart, selectionEnd } = textareaProps;

    if (value != null) {
      value = String(value);

      // browsers move the caret to the end on value assignment, so a
      // value-only update must restore the current selection afterwards
      if (selectionStart == null) {
        selectionStart = this.textarea.selectionStart;
      }

      if (selectionEnd == null) {
        selectionEnd = this.textarea.selectionEnd;
      }

      if (this.textarea.value !== value) {
        this.textarea.value = value;
      }
    }

    if (selectionStart != null) {
      this.textarea.selectionStart = selectionStart;
    }

    if (selectionEnd != null) {
      this.textarea.selectionEnd = selectionEnd;
    }

    if (value === this.value || value == null) {
      return;
    }

    this.value = value;
    this.render();

    if (this.updateCallback) {
      this.updateCallback(value);
    }
  }

  updateOptions(options) {
    if (!this.textarea) {
      return;
    }

    this.options = {
      ...this.options,
      ...options,
    };

    if (options.styles) {
      // new style keys must land in the snapshot or destroy() would miss them
      Object.keys(options.styles).forEach((key) => {
        if (!(key in this.initialRootStyles)) {
          this.initialRootStyles[key] = this.root.style[key] || "";
        }
      });
      Object.assign(this.root.style, options.styles);

      if ("paddingLeft" in options.styles || "padding" in options.styles) {
        this.basePaddingLeft = this.root.style.paddingLeft || "";
      }
    }

    if (this.lines && !this.options.lineNumbers) {
      removeNode(this.lines);
      this.lines = null;
      this.root.style.paddingLeft = this.basePaddingLeft;
    }

    if (options.value != null) {
      this.update({ value: options.value });
    }

    this.render();
  }

  render() {
    const highlighted = this.options.highlighter(this.value);
    this.pre.innerHTML = highlighted + "<br/>";

    this.updateLines();
  }

  updateLines() {
    if (!this.options.lineNumbers) {
      return;
    }

    if (!this.lines) {
      this.lines = document.createElement("pre");
      this.root.appendChild(this.lines);
      Object.assign(this.lines.style, linesStyles);
    }

    const lines = this.value.split("\n");
    const length = lines.length.toString().length;

    this.root.style.paddingLeft = `${length + 1}ch`;

    this.lines.innerHTML = lines
      .map((line, number) => {
        // prettier-ignore
        const lineNumber = `<span class="yace-line" style="position: absolute; opacity: .3; left: 0">${1 + number}</span>`
        // prettier-ignore
        const lineText = `<span style="color: transparent; pointer-events: none">${escape(line)}</span>`;
        return `${lineNumber}${lineText}`;
      })
      .join("\n");
  }

  destroy() {
    if (!this.textarea) {
      return;
    }

    this.textarea.removeEventListener("input", this.handleEvent);
    this.textarea.removeEventListener("keydown", this.handleEvent);
    this.textarea.removeEventListener("compositionend", this.handleEvent);

    // a framework may have detached the nodes already (e.g. React unmount),
    // so remove from the actual parent instead of assuming root
    removeNode(this.textarea);
    removeNode(this.pre);
    removeNode(this.lines);

    Object.assign(this.root.style, this.initialRootStyles);

    this.textarea = null;
    this.pre = null;
    this.lines = null;
    this.updateCallback = null;
    this.handleEvent = null;
    this.initialRootStyles = null;
    this.options = null;
    this.root = null;
  }

  onUpdate(callback) {
    this.updateCallback = callback;
  }
}

function removeNode(node) {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

function runPlugins(plugins, event) {
  const { value, selectionStart, selectionEnd } = event.target;

  return plugins.reduce(
    (acc, plugin) => {
      return {
        ...acc,
        ...plugin(acc, event),
      };
    },
    { value, selectionStart, selectionEnd }
  );
}

function escape(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default Yace;
