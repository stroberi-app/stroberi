declare global {
  namespace JSX {
    type Element = React.JSX.Element;
  }
}

// Note: chart wrapper type helpers now live in lib/chartTypes.ts, so the
// previous victory-native deep-import module augmentation is no longer required.

export {};
