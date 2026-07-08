import {
  textareaStyles,
  preStyles,
  rootStyles,
  linesStyles,
} from "./styles.ts";

export interface TextareaProps {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export type Plugin = (
  props: TextareaProps,
  event: Event,
) => Partial<TextareaProps> | void;

/**
 * A highlighter turns a value into HTML. `context.html` is false for the first
 * stage of the `highlighters` pipeline (raw code — escape it) and true for later
 * stages (the input is prior HTML — copy tags verbatim, do not re-escape).
 */
export type Highlighter = (
  value: string,
  context?: { html: boolean },
) => string;

export interface YaceOptions {
  /** the contract is string; the runtime String(...) coercion is JS-only defense */
  value?: string;
  lineNumbers?: boolean;
  /** a pipeline, mirroring `plugins`; a bare function is tolerated at runtime */
  highlighters?: Highlighter[];
  styles?: Record<string, string>;
  plugins?: Plugin[];
}

type ResolvedOptions = {
  value: string;
  lineNumbers?: boolean;
  highlighter: Highlighter;
  styles: Record<string, string>;
  plugins: Plugin[];
};

const defaultHighlighter: Highlighter = (value) => escape(value);

// the typed option is an array (mirrors `plugins`); a bare function is tolerated
// at runtime for JS callers. the array runs as a pipeline: stage 0 gets the raw
// value (html:false), each later stage gets the previous stage's HTML (html:true)
function normalizeHighlighters(
  highlighters: Highlighter | Highlighter[],
): Highlighter {
  const list = Array.isArray(highlighters) ? highlighters : [highlighters];
  // an empty pipeline would reduce to the identity and pass the raw value
  // straight to innerHTML — fall back to the escaping default (XSS-safe)
  if (list.length === 0) {
    return defaultHighlighter;
  }
  return (value) =>
    list.reduce((input, h, i) => h(input, { html: i > 0 }), value);
}

export default class Yace {
  root!: HTMLElement;
  textarea!: HTMLTextAreaElement;
  pre!: HTMLPreElement;
  value!: string;
  private options: ResolvedOptions;
  private lines: HTMLPreElement | null = null;
  private initialRootStyles!: Record<string, string>;
  private basePaddingLeft!: string;
  private handleEvent!: (event: Event) => void;
  private updateCallback?: (value: string) => void;

  constructor(selector: string | Node, options: YaceOptions = {}) {
    if (!selector) {
      throw new Error("selector is not defined");
    }

    this.root = (
      selector instanceof Node ? selector : document.querySelector(selector)
    ) as HTMLElement;

    if (!this.root) {
      throw new Error(`element with "${selector}" selector is not exist`);
    }

    const defaultOptions: Omit<ResolvedOptions, "lineNumbers"> = {
      value: "",
      styles: {},
      plugins: [],
      highlighter: defaultHighlighter,
    };

    const { highlighters, ...rest } = options;
    this.options = {
      ...defaultOptions,
      ...rest,
      highlighter: highlighters
        ? normalizeHighlighters(highlighters)
        : defaultOptions.highlighter,
    };

    this.options.value =
      this.options.value == null ? "" : String(this.options.value);

    this.init();
  }

  private init(): void {
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
    // CSSStyleDeclaration has no string index signature; read camelCase props as a map
    const rootStyle = this.root.style as unknown as Record<string, string>;
    mutatedStyleKeys.forEach((key) => {
      this.initialRootStyles[key] = rootStyle[key] || "";
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

  private addTextareaEvents(): void {
    this.handleEvent = (event) => {
      const keyEvent = event as KeyboardEvent;
      if (keyEvent.isComposing || keyEvent.keyCode === 229) {
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

  update(props: Partial<TextareaProps>): void {
    // an async consumer callback can land after destroy (e.g. React unmount)
    if (!this.textarea) {
      return;
    }

    let { value, selectionStart, selectionEnd } = props;

    if (value != null) {
      value = String(value);

      // browsers move the caret to the end on value assignment, so a
      // value-only update must restore the current selection afterwards
      if (selectionStart == null) {
        selectionStart = this.textarea.selectionStart as number;
      }

      if (selectionEnd == null) {
        selectionEnd = this.textarea.selectionEnd as number;
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

  updateOptions(options: YaceOptions): void {
    if (!this.textarea) {
      return;
    }

    const { highlighters, ...rest } = options;
    this.options = {
      ...this.options,
      ...rest,
      highlighter: highlighters
        ? normalizeHighlighters(highlighters)
        : this.options.highlighter,
    };

    if (options.styles) {
      const rootStyle = this.root.style as unknown as Record<string, string>;
      // new style keys must land in the snapshot or destroy() would miss them
      Object.keys(options.styles).forEach((key) => {
        if (!(key in this.initialRootStyles)) {
          this.initialRootStyles[key] = rootStyle[key] || "";
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

  private render(): void {
    const highlighted = this.options.highlighter(this.value);
    this.pre.innerHTML = highlighted + "<br/>";

    this.updateLines();
  }

  private updateLines(): void {
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

    // gutter reserves (length + 1)ch; digits take the first `length`ch and
    // right-align, leaving the trailing 1ch as the gap before the code
    this.root.style.paddingLeft = `${length + 1}ch`;

    this.lines.innerHTML = lines
      .map((line, number) => {
        // prettier-ignore
        const lineNumber = `<span class="yace-line" style="position: absolute; opacity: .3; left: 0; width: ${length}ch; text-align: right">${1 + number}</span>`;
        // prettier-ignore
        const lineText = `<span style="color: transparent; pointer-events: none">${escape(line)}</span>`;
        return `${lineNumber}${lineText}`;
      })
      .join("\n");
  }

  destroy(): void {
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

    // the public fields are typed non-null per the frozen type contract, so the
    // teardown reset goes through Object.assign, which bypasses those field types
    Object.assign(this, {
      textarea: null,
      pre: null,
      lines: null,
      updateCallback: null,
      handleEvent: null,
      initialRootStyles: null,
      options: null,
      root: null,
    });
  }

  onUpdate(cb: (value: string) => void): void {
    this.updateCallback = cb;
  }
}

function removeNode(node: Node | null): void {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

function runPlugins(plugins: Plugin[], event: Event): TextareaProps {
  const { value, selectionStart, selectionEnd } =
    event.target as HTMLTextAreaElement;

  return plugins.reduce<TextareaProps>(
    (acc, plugin) => {
      return {
        ...acc,
        ...plugin(acc, event),
      };
    },
    {
      value,
      selectionStart: selectionStart as number,
      selectionEnd: selectionEnd as number,
    },
  );
}

function escape(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
