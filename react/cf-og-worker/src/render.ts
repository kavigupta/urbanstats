/*
 * The drawing half, kept behind a dynamic import in index.ts: evaluating satori is most of this
 * Worker's startup, and rewriting a page's tags has no use for it.
 */
import { Resvg, initWasm } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
// The default satori build compiles Yoga from base64 as it evaluates, which throws under a dynamic
// import because Workers only permit compiling wasm while the global scope runs. The standalone
// build takes the binary as a module wrangler compiled at deploy time instead.
import satori, { init as initYoga } from 'satori/standalone'
import yogaWasm from 'satori/yoga.wasm'

import { PageDescriptor } from '../../src/navigation/PageDescriptor'
import jostRegular from '../assets/Jost-400.ttf'
import jostSemiBold from '../assets/Jost-600.ttf'

import { articleCard, loadPage, loadShape } from './data'
import { embedCard } from './embed'

type ArticleDescriptor = Extract<PageDescriptor, { kind: 'article' }>

let wasmReady: Promise<unknown> | undefined

export async function renderCard(origin: string, descriptor: ArticleDescriptor, tileOrigin: string): Promise<Uint8Array | undefined> {
    const [page, rings] = await Promise.all([
        loadPage(origin, descriptor).catch(() => undefined),
        loadShape(origin, descriptor.longname).catch(() => []),
    ])
    if (page?.pageData.kind !== 'article') {
        return undefined
    }

    wasmReady ??= Promise.all([initYoga(yogaWasm), initWasm(resvgWasm)])
    await wasmReady

    const size = { width: 1200, height: 630 }
    const card = await embedCard(await articleCard(page.pageData, page.settings), rings, size, tileOrigin)
    const svg = await satori(card, {
        ...size,
        fonts: [
            { name: 'Jost', data: jostRegular, weight: 400, style: 'normal' },
            { name: 'Jost', data: jostSemiBold, weight: 600, style: 'normal' },
        ],
    })

    return new Resvg(svg, { fitTo: { mode: 'width', value: size.width } }).render().asPng()
}
