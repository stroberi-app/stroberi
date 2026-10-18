/** Expo Router params can arrive as arrays; screens only ever use the first value. */
export const firstParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
