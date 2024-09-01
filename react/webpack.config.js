const path = require('path');

const NodePolyfillPlugin = require('node-polyfill-webpack-plugin')

module.exports = env => ({
    entry: {
        "article": ['./src/article.tsx'],
        "quiz": ['./src/quiz.tsx'],
        "index": ['./src/index.tsx'],
        "random": ["./src/random.ts"],
        "about": ['./src/about.tsx'],
        "data-credit": ['./src/data-credit.tsx'],
        "mapper": ['./src/mapper.tsx'],
        "comparison": ['./src/comparison.tsx'],
        "statistic": ['./src/statistic.tsx']
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
    ],
    devServer: {
        static: {
            directory: env.directory,
        },
        compress: true,
        port: 8000,
        devMiddleware: {
            writeToDisk: true,
        },
    },
});
