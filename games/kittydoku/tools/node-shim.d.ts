// Minimal Node typings for the offline tools (the game itself never touches
// Node, so we don't pull in @types/node just for these scripts).
declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void;
  export function readFileSync(path: string, encoding: 'utf8'): string;
}

declare const process: {
  argv: string[];
  exit(code: number): never;
};
