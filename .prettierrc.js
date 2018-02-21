module.exports = {
  singleQuote: true,
  trailingComma: 'es5',
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
