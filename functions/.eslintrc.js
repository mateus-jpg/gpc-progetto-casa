module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
  },
  extends: ["eslint:recommended", "google"],
  rules: {
    indent: "off",
    "max-len": "off",
    "object-curly-spacing": "off",
    "operator-linebreak": "off",
    "quote-props": "off",
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    quotes: ["error", "double", { allowTemplateLiterals: true }],
  },
  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],
  globals: {},
};
