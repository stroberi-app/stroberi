module.exports = api => {
  api.cache(true);
  const isDev = process.env.NODE_ENV !== 'production';

  return {
    presets: [
      'babel-preset-expo',
      ...(isDev ? ['@ohah/react-native-mcp-server/babel-preset'] : []),
    ],
  };
};
