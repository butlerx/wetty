module.exports = {
  singleQuote: true,
  trailingComma: 'all',
  proseWrap: 'always',
  overrides: [
    {
      files: ['*.js', '*.mjs'],
      options: {
        printWidth: 80,
      },
    },
  ],
};
