// Runs the edge render path in Node, where it is far easier to look at the output.
import { readFileSync, writeFileSync } from 'node:fs'

import { Resvg, initWasm } from '@resvg/resvg-wasm'
import satori from 'satori'

import { loadArticle, loadShape } from './src/data.js'
import { embedCard } from './src/embed.js'

const origin = process.env.SITE_ORIGIN ?? 'https://urbanstats.org'
const longname = process.argv[2] ?? 'Chicago city, Illinois, USA'
const size = { width: 1200, height: 630 }

// Static instances of the site's variable Jost: satori's font parser cannot read an fvar table.
const fonts = [
    { name: 'Jost', data: readFileSync('assets/Jost-400.ttf'), weight: 400, style: 'normal' },
    { name: 'Jost', data: readFileSync('assets/Jost-600.ttf'), weight: 600, style: 'normal' },
]

const t0 = Date.now()
const [article, rings] = await Promise.all([
    loadArticle(origin, longname, 'world'),
    loadShape(origin, longname).catch(() => []),
])
const t1 = Date.now()

const svg = await satori(embedCard(article, rings ?? [], size), { ...size, fonts })
const t2 = Date.now()

await initWasm(readFileSync('node_modules/@resvg/resvg-wasm/index_bg.wasm'))
const png = new Resvg(svg, { fitTo: { mode: 'width', value: size.width } }).render().asPng()
const t3 = Date.now()

writeFileSync('/tmp/embed-satori.png', png)
console.log(`${longname}`)
console.log(`  data   ${t1 - t0}ms   (${article.stats.length} stats, ${rings?.length ?? 0} rings)`)
console.log(`  satori ${t2 - t1}ms   svg ${(svg.length / 1024).toFixed(0)}KB`)
console.log(`  resvg  ${t3 - t2}ms   png ${(png.length / 1024).toFixed(0)}KB`)
console.log(`  total  ${t3 - t0}ms -> /tmp/embed-satori.png`)
