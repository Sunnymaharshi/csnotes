module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './tamagui.config.ts',
          logTimings: true,
        },
      ],
      // Required by react-native-reanimated v4 (used by the drawer navigator).
      // Must be listed last.
      'react-native-worklets/plugin',
    ],
  };
};
