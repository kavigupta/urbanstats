const path = require('path');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: {
        "article": ['./src/article.js'],
        "index": ['./src/index.js']
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, '..', 'dist'),
        clean: true
    },
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: ["", ".webpack.js", ".web.js", ".ts", ".tsx", ".js"],
    },
    module: {
        rules: [
            { test: /\.tsx?$/, loader: "ts-loader" },
            { test: /\.js$/, loader: "babel-loader" },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"]
            },

        ],
    },
    devtool: 'inline-source-map',
};
