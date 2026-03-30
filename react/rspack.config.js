import path from 'path'

import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'
import { rspack } from "@rspack/core"

const isProduction = process.env.NODE_ENV === 'production'

// Helpful for debugging loops in watch mode
class LogChangedFile {
  apply(compiler) {
    compiler.hooks.invalid.tap('MyWatchPlugin', (fileName, changeTime) => {
      console.log(`Changed file: ${fileName}, change time: ${new Date(changeTime).toLocaleString()}`);
    });
  }
}

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
            {
                test: /\.(ttf|woff|woff2|eot|otf)$/i,
                type: 'asset/resource',
            },

        ],
    },
    // devtool: 'inline-source-map',
    plugins: [
        new NodePolyfillPlugin(),
        new ForkTsCheckerWebpackPlugin(),
        new LogChangedFile()
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
        allowedHosts: [
            '.local'
        ],
    },
    watchOptions: {
        ignored: env.directory
    },
    performance: {
        hints: isProduction ? 'error' : false,
        maxAssetSize: 1_200_000,
        maxEntrypointSize: 1_100_000,
        assetFilter: asset => asset !== 'quiz_infinite.js' && !asset.endsWith('.map')
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                maplibre: {
                    test: /maplibre/,
                    name: 'maplibre',
                },
                quiz_infinite: {
                    test: /data\/quiz_infinite\.ts$/,
                    name: 'quiz_infinite'
                }
            },
        },
        minimizer: [
            new rspack.SwcJsMinimizerRspackPlugin({
                exclude: /maplibre/ // MapLibre starts having race conditions if minimized
            }),
            new rspack.LightningCssMinimizerRspackPlugin(),
        ],
    },
})
