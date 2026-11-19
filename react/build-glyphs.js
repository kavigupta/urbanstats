// node build-glyphs.js OUT_DIR PYTHON
// Builds MapLibre glyphs for Jost, for the ranges Jost covers, with Noto filling in characters Jost lacks.
// Other ranges are left to OpenFreeMap's Noto glyphs, see mapTransformRequest. PYTHON needs fontTools, which
// cuts fixed weights out of the variable font.
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { promisify } from 'util'

import fontnik from 'fontnik'

const load = promisify(fontnik.load)
const range = promisify(fontnik.range)
const composite = promisify(fontnik.composite)

const [outDir, python] = process.argv.slice(2)
const fontDir = path.join(import.meta.dirname, 'src/fonts')
// name: [variable font, weight, Noto fallback]
const fonts = {
    'Jost Regular': ['Jost-VariableFont_wght.ttf', 400, 'Noto Sans Regular'],
    'Jost Medium': ['Jost-VariableFont_wght.ttf', 500, 'Noto Sans Regular'],
    'Jost 550': ['Jost-VariableFont_wght.ttf', 550, 'Noto Sans Bold'],
    'Jost Bold': ['Jost-VariableFont_wght.ttf', 700, 'Noto Sans Bold'],
    'Jost Italic': ['Jost-Italic-VariableFont_wght.ttf', 400, 'Noto Sans Italic'],
}

function instance(tempDir, file, weight) {
    const out = path.join(tempDir, `${path.basename(file, '.ttf')}-${weight}.ttf`)
    execFileSync(python, ['-m', 'fontTools.varLib.instancer', path.join(fontDir, file), `wght=${weight}`, '-o', out], { stdio: 'ignore' })
    return fs.readFileSync(out)
}

async function main() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glyphs-'))
    const starts = new Set()
    for (const [name, [file, weight, noto]] of Object.entries(fonts)) {
        const font = instance(tempDir, file, weight)
        const [face] = await load(font)
        const fontStarts = [...new Set(face.points.map(p => p - (p % 256)))].sort((a, b) => a - b)
        fs.mkdirSync(path.join(outDir, name), { recursive: true })
        for (const start of fontStarts) {
            starts.add(start)
            const file = `${start}-${start + 255}.pbf`
            const jost = await range({ font, start, end: start + 255 })
            const response = await fetch(`https://tiles.openfreemap.org/fonts/${encodeURIComponent(noto)}/${file}`)
            if (!response.ok) {
                throw new Error(`OpenFreeMap answered ${response.status} for ${noto} ${file}`)
            }
            fs.writeFileSync(path.join(outDir, name, file), await composite([jost, Buffer.from(await response.arrayBuffer())]))
        }
    }
    fs.rmSync(tempDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'ranges.json'), JSON.stringify([...starts].sort((a, b) => a - b)))
}

await main()
