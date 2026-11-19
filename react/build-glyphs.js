// Reads [{font, start, fallback, out}] as JSON on stdin. Writes to each `out` the MapLibre glyphs for the 256
// characters from `start` in the font file `font`, filling in characters it lacks from the glyph file `fallback`.
import fs from 'fs'
import { promisify } from 'util'

import fontnik from 'fontnik'

const range = promisify(fontnik.range)
const composite = promisify(fontnik.composite)

const jobs = JSON.parse(fs.readFileSync(0, 'utf8'))
const fonts = new Map()
for (const { font, start, fallback, out } of jobs) {
    if (!fonts.has(font)) {
        fonts.set(font, fs.readFileSync(font))
    }
    const glyphs = await range({ font: fonts.get(font), start, end: start + 255 })
    fs.writeFileSync(out, await composite([glyphs, fs.readFileSync(fallback)]))
}
