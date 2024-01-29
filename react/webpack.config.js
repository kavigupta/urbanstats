const path = require('path');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

module.exports = {
    entry: {
        "article": ['./src/article.js'],
        "quiz": ['./src/quiz.js'],
        "index": ['./src/index.js'],
        "random": ["./src/random.js"],
        "about": ['./src/about.js'],
        "data-credit": ['./src/data-credit.js'],
        "mapper": ['./src/mapper.js'],
        "comparison": ['./src/comparison.js']
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
    // devtool: 'inline-source-map',
    plugins: [
        new NodePolyfillPlugin(),
    ]

};
