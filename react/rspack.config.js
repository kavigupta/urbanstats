import path from 'path'

import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'

const isProduction = process.env.NODE_ENV === 'production'

export default env => ({
    entry: {
        index: ['./src/index.tsx'],
        loading: ['./src/loading.ts'],
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
            '.mjs': ['.mts', '.mjs'],
        },
    },
    module: {
        rules: [
            { test: /\.tsx?$/, loader: 'builtin:swc-loader' },
            { 
                test: /\.m?js$/, loader: 'builtin:swc-loader', 
                resolve: { fullySpecified: false }, 
                exclude: [
                    path.resolve(import.meta.dirname, 'node_modules/maplibre-gl')
                ] 
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },

        ],
    },
    // devtool: 'inline-source-map',
    plugins: [
        new NodePolyfillPlugin(),
        new ForkTsCheckerWebpackPlugin(),
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
    performance: {
        hints: isProduction ? 'error': false,
        maxAssetSize: Number.MAX_SAFE_INTEGER,
        maxEntrypointSize: 3.2 * Math.pow(2, 20)
    }
})
