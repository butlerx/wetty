module.exports = {
  env: {
    es6: true,
    node: true,
    browser: true
  },
  root: true,
  extends: ["airbnb-base", "plugin:prettier/recommended"],
  rules: {
    "linebreak-style": ["error", "unix"],
    "arrow-parens": ["error", "as-needed"],
    "no-param-reassign": ["error", { props: false }],
    "func-style": ["error", "declaration", { allowArrowFunctions: true }],
    "no-use-before-define": ["error", { functions: false }]
  }
};
