var path = require('path')
var webpack = require('webpack')
var yutil = require('youboralib-util')
var pkg = require('./package.json')

module.exports = {
  entry: './src/sp.js',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: 'sp.min.js',
    library: 'youbora',
    libraryTarget: 'umd'
  },
  devtool: 'source-map',
  plugins: [
    new webpack.BannerPlugin({
      banner: yutil.license(pkg),
      entryOnly: true
    })
  ]
}
