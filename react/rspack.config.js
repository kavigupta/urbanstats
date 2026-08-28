import path from 'path'

import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin'
import { rspack } from "@rspack/core"
import { port } from "./port.js"

const isProduction = process.env.NODE_ENV === 'production'

// A production build that keeps React's warnings, for the site the e2e tests run against: a test
// that logs one fails, and a production React logs none.
const keepReactWarnings = process.env.REACT_WARNINGS === '1'

// React's development build costs 170kB, which that build is allowed on top of what our own code
// is allowed in the one people are served.
const sizeLimit = 1_200_000 + (keepReactWarnings ? 200_000 : 0)

// dev-server-advice listens on the dev server's websocket, which only exists under `serve`.
const isServing = process.argv.includes('serve')

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
        index: [...(isServing ? ['./src/dev-server-advice.ts'] : []), './src/index.tsx'],
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
        port: port(),
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
        maxAssetSize: sizeLimit,
        maxEntrypointSize: sizeLimit,
        assetFilter: asset => asset !== 'quiz_infinite.js' && !asset.endsWith('.map')
    },
    optimization: {
        nodeEnv: keepReactWarnings ? 'development' : undefined,
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
