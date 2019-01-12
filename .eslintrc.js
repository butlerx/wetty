module.exports = {
  parser: 'eslint-plugin-typescript/parser',
  plugins: ['typescript', 'prettier'],
  env: {
    es6: true,
    node: true,
    browser: true,
  },
  root: true,
  extends: [
    'airbnb-base',
    'plugin:typescript/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    'typescript/indent': 'off',
    'linebreak-style': ['error', 'unix'],
    'arrow-parens': ['error', 'as-needed'],
    'no-param-reassign': ['error', { props: false }],
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
    'no-use-before-define': ['error', { functions: false }],
    'typescript/no-use-before-define': ['error', { functions: false }],
  },
  settings: {
    'import/resolver': {
      'typescript-eslint-parser': ['.ts', '.tsx'],
      node: {
        extensions: ['.ts', '.js'],
      },
    },
  },
};
