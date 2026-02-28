// declare ttf as files
declare module '*.ttf' {
  const value: string;
  export default value;
}

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (value: unknown) => {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
};
