export interface TextareaProps {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export type Plugin = (
  props: TextareaProps,
  event: Event
) => Partial<TextareaProps> | void;

export interface YaceOptions {
  // the contract is string; the runtime String(...) coercion is JS-only defense
  value?: string;
  lineNumbers?: boolean;
  highlighter?: (value: string) => string;
  styles?: Record<string, string>;
  plugins?: Plugin[];
}

export default class Yace {
  constructor(selector: string | Node, options?: YaceOptions);
  root: HTMLElement;
  textarea: HTMLTextAreaElement;
  pre: HTMLPreElement;
  value: string;
  update(props: Partial<TextareaProps>): void;
  updateOptions(options: YaceOptions): void;
  onUpdate(cb: (value: string) => void): void;
  destroy(): void;
}
