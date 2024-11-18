import path, { resolve } from 'path'

import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'

export default env => ({
    entry: {
        'article': ['./src/article.tsx'],
        'quiz': ['./src/quiz.tsx'],
        'index': ['./src/index.tsx'],
        'random': ['./src/random.ts'],
        'about': ['./src/about.tsx'],
        'data-credit': ['./src/data-credit.tsx'],
        'mapper': ['./src/mapper.tsx'],
        'comparison': ['./src/comparison.tsx'],
        'statistic': ['./src/statistic.tsx'],
    },
    output: {
        filename: '[name].js',
        path: path.resolve(import.meta.dirname, '..', 'dist'),
        clean: true,
    },
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js'],
        extensionAlias: {
            '.js': ['.ts', '.js'],
            '.mjs': ['.mts', '.mjs']
        },
    },
    module: {
        rules: [
            { test: /\.tsx?$/, loader: 'builtin:swc-loader' },
            { test: /\.m?js$/, loader: 'builtin:swc-loader', resolve: { fullySpecified: false } },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },

        ],
    },
    // devtool: 'inline-source-map',
    plugins: [
        new NodePolyfillPlugin(),
        new ForkTsCheckerWebpackPlugin()
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
})
