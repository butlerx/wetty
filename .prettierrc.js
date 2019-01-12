module.exports = {
  singleQuote: true,
  trailingComma: 'es5',
  proseWrap: 'always',
  overrides: [
    {
      files: ['*.js', '*.ts'],
      options: {
        printWidth: 80,
      },
    },
  ],
};
