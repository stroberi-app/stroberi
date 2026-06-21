declare global {
  namespace JSX {
    type Element = React.JSX.Element;
  }
}

declare module 'victory-native/dist/types' {
  export type InputFields<T> = {
    [K in keyof T as T[K] extends string | number ? K : never]: T[K];
  };

  export type NumericalFields<T> = {
    [K in keyof T as T[K] extends number ? K : never]: T[K];
  };
}

export {};
