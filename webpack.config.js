const webpack = require('webpack');
const path = require('path');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const extractSass = new ExtractTextPlugin({
  filename: '[name].css',
  disable: process.env.NODE_ENV === 'development',
});

const loader = new webpack.ProvidePlugin({
  fetch: 'imports-loader?this=>global!exports-loader?global.fetch!whatwg-fetch',
});

module.exports = {
  entry: './src/index.js',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          plugins: ['lodash'],
          presets: [
            [
              'env',
              {
                targets: {
                  browsers: ['last 2 versions', 'safari >= 7'],
                },
              },
            ],
          ],
        },
      },
      {
        test: /\.scss$/,
        use: extractSass.extract({
          use: [
            {
              loader: 'css-loader',
              options: { minimize: true },
            },
            {
              loader: 'sass-loader',
            },
          ],
          fallback: 'style-loader',
        }),
      },
    ],
  },
  plugins:
    process.env.NODE_ENV !== 'development'
      ? [
          loader,
          extractSass,
          new UglifyJSPlugin({
            parallel: true,
            uglifyOptions: {
              ecma: 8,
            },
          }),
        ]
      : [loader, extractSass],
  stats: {
    colors: true,
  },
};
