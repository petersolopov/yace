declare class Yace {
  constructor(selector: string | Node, options?: Yace.YaceOptions);
  root: HTMLElement;
  textarea: HTMLTextAreaElement;
  pre: HTMLPreElement;
  value: string;
  update(props: Partial<Yace.TextareaProps>): void;
  updateOptions(options: Yace.YaceOptions): void;
  onUpdate(cb: (value: string) => void): void;
  destroy(): void;
}

declare namespace Yace {
  interface TextareaProps {
    value: string;
    selectionStart: number;
    selectionEnd: number;
  }
  type Plugin = (
    props: TextareaProps,
    event: Event
  ) => Partial<TextareaProps> | void;
  interface YaceOptions {
    // the contract is string; the runtime String(...) coercion is JS-only defense
    value?: string;
    lineNumbers?: boolean;
    highlighter?: (value: string) => string;
    styles?: Record<string, string>;
    plugins?: Plugin[];
  }
}

export = Yace;
