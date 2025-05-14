import path from 'path'

import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'
import { execa } from "execa"

const isProduction = process.env.NODE_ENV === 'production'

class HashPlugin {
    apply(compiler) {
        compiler.hooks.afterEmit.tap('HashPlugin', (event) => {
            execa('bash', ['-c', `shasum -a 256 ** | shasum -a 256 > hash.txt`], { cwd: event.outputOptions.path })
        })
    }
}

export default env => ({
    entry: {
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
    plugins: [
        new NodePolyfillPlugin(),
        new ForkTsCheckerWebpackPlugin(),
        new HashPlugin()
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
        hints: false
    },
    externals: {
        'maplibre-gl': 'window maplibregl'
    }
})
