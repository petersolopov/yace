declare module "mdhl" {
  export function highlight(src: string): string;
  export function escape(unsafe: string): string;
}
