module.exports = {
  extends: ['airbnb-base', 'prettier', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  ignorePatterns: ['dist'],
  root: true,
  env: {
    node: true,
    browser: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    'func-style': ['error', 'declaration', { allowArrowFunctions: true }],
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        ts: 'never',
        js: 'ignorePackages',
        mjs: 'ignorePackages',
        jsx: 'never',
        tsx: 'never',
      },
    ],
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: ['**/*.test.*', '**/*.spec.*', 'build.js'] },
    ],
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'internal',
          'external',
          'parent',
          'sibling',
          'index',
          'object',
          'type',
        ],
        pathGroups: [{ pattern: '@ev/**', group: 'internal' }],
        distinctGroup: true,
        alphabetize: { order: 'asc', caseInsensitive: false },
      },
    ],
    'import/prefer-default-export': 'off',
    'import/prefer-default-export': 'off',
    'linebreak-style': ['error', 'unix'],
    'lines-between-class-members': [
      'error',
      'always',
      { exceptAfterSingleLine: true },
    ],
    'no-param-reassign': ['error', { props: false }],
    'no-use-before-define': ['error', { functions: false }],
  },
  settings: {
    // Apply special parsing for TypeScript files
    'import/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx', '.d.ts'] },
    'import/resolver': {
      typescript: {
        project: ['./tsconfig.browser.json', './tsconfig.node.json'],
      },
      node: { extensions: ['.mjs', '.js', '.json', '.ts', '.d.ts'] },
    },
    'import/extensions': ['.js', '.mjs', '.jsx', '.ts', '.tsx', '.d.ts'],
    // Resolve type definition packages
    'import/external-module-folders': ['node_modules', 'node_modules/@types'],
  },
  overrides: [
    { files: ['*.ts', '*.tsx'], rules: { 'import/no-unresolved': 'off' } },
    {
      files: ['*.js', '*.jsx'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-unresolved': 'off',
      },
    },
    {
      files: ['*.spec.*', '*.test.*'],
      extends: ['plugin:mocha/recommended'],
      plugins: ['mocha'],
      rules: {
        'import/no-extraneous-dependencies': ['off'],
        'mocha/no-mocha-arrows': ['off'],
        'no-unused-expressions': ['off'],
      },
    },
  ],
};
