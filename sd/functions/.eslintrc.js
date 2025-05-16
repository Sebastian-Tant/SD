module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files
  ],
  rules: {
    "quotes": ["error", "double"],
    "indent": ["error", 2],
    "max-len": ["error", { "code": 120 }],
    "object-curly-spacing": ["error", "always"],
    "linebreak-style": 0, // Disable linebreak style check
    "comma-dangle": ["error", "only-multiline"],
    "arrow-parens": ["error", "as-needed"],
    "eol-last": ["error", "always"] // Add this rule for end-of-file newlines
  },
};
// Add a newline here
