// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
let config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Let Metro resolve Tamagui through package exports, preferring native entrypoints.
config.resolver = config.resolver || {};
config.resolver.unstable_conditionNames = [
  ...(config.resolver.unstable_conditionNames || []),
  'react-native',
];

// 2. Enable Tamagui
const { withTamagui } = require('@tamagui/metro-plugin');
module.exports = withTamagui(config, {
  components: ['tamagui'],
  config: './tamagui.config.ts',
  outputCSS: './tamagui-web.css',
});
