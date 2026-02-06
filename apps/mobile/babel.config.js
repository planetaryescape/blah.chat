module.exports = (api) => {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
    overrides: [
      {
        test: /node_modules\/bible-passage-reference-parser/,
        plugins: [
          ["@babel/plugin-transform-private-methods", { loose: true }],
          ["@babel/plugin-transform-class-properties", { loose: true }],
          [
            "@babel/plugin-transform-private-property-in-object",
            { loose: true },
          ],
        ],
      },
    ],
  };
};
