import path from 'path';
import webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import nodeExternals from 'webpack-node-externals';

const template = override =>
  Object.assign(
    {
      mode: process.env.NODE_ENV || 'development',
      resolve: {
        modules: [path.resolve(__dirname, 'src'), 'node_modules'],
        extensions: ['.ts', '.json', '.js', '.node'],
      },

      stats: {
        colors: true,
      },
    },
    override
  );

const entry = (folder, file) =>
  path.join(__dirname, 'src', folder, `${file}.ts`);

const entries = (folder, files) =>
  Object.assign(...files.map(file => ({ [file]: entry(folder, file) })));

export default [
  template({
    entry: entries('server', ['index', 'buffer']),
    target: 'node',
    devtool: 'source-map',
    output: {
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'commonjs2',
      filename: '[name].js',
    },
    node: {
      __filename: false,
      __dirname: false,
    },
    externals: [nodeExternals()],
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-typescript',
                [
                  '@babel/preset-env',
                  {
                    targets: {
                      node: 'current',
                    },
                  },
                ],
              ],
              plugins: ['lodash'],
            },
          },
        },
        {
          test: /\.js$/,
          use: ['source-map-loader'],
          enforce: 'pre',
        },
      ],
    },
    plugins: [new webpack.IgnorePlugin(/uws/)],
  }),
  template({
    entry: entries('client', ['index']),
    output: {
      path: path.resolve(__dirname, 'dist', 'client'),
      filename: '[name].js',
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-typescript',
                [
                  '@babel/preset-env',
                  {
                    targets: {
                      browsers: ['last 2 versions', 'safari >= 7'],
                    },
                  },
                ],
              ],
              plugins: ['lodash'],
            },
          },
        },
        {
          test: /\.js$/,
          use: ['source-map-loader'],
          enforce: 'pre',
        },
        {
          test: /\.scss$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
            },
            {
              loader: 'css-loader',
            },
            {
              loader: 'sass-loader',
            },
          ],
        },
        {
          test: /\.(jpg|jpeg|png|gif|mp3|svg|ico)$/,
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
          },
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: '[name].css',
        chunkFilename: '[id].css',
      }),
    ],
    devtool: 'source-map',
  }),
];
