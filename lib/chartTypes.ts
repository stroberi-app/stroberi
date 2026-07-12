// Shared Victory Native type helpers used by the chart wrappers.
//
// Victory's package `exports` map blocks deep imports of its internal `types`
// entry, and its public `XK`/`YK` generic constraints are stricter than a
// reusable wrapper can express. We therefore mirror the two field-narrowing
// helpers here (single source of truth) and expose loose compat aliases for the
// generic chart args and press-state container.
import type { ChartPressState } from 'victory-native';

export type InputFields<T> = {
  [K in keyof T as T[K] extends string | number ? K : never]: T[K];
};

export type NumericalFields<T> = {
  [K in keyof T as T[K] extends number ? K : never]: T[K];
};

// biome-ignore lint/suspicious/noExplicitAny: Victory 41's public generics are stricter than this reusable wrapper can express.
export type VictoryCompatKey = any;

// biome-ignore lint/suspicious/noExplicitAny: Victory does not export a generic-friendly press-state shape for wrappers over arbitrary y-keys.
export type VictoryCompatPressState = ChartPressState<any>;
