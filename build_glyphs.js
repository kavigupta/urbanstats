// Builds MapLibre glyphs for Jost, for the ranges Jost covers, with Noto filling in characters Jost lacks.
// Other ranges are left to OpenFreeMap's Noto glyphs, see transformRequest in temp.html.
const fs = require('fs')
const { promisify } = require('util')
const fontnik = require('fontnik')

const load = promisify(fontnik.load)
const range = promisify(fontnik.range)
const composite = promisify(fontnik.composite)

const fonts = {
    'Jost Regular': ['../population_density/react/src/fonts/Jost-VariableFont_wght.ttf', 'Noto Sans Regular'],
    'Jost Bold': ['../population_density/react/cf-og-worker/assets/Jost-600.ttf', 'Noto Sans Bold'],
    'Jost Italic': ['../population_density/react/src/fonts/Jost-Italic-VariableFont_wght.ttf', 'Noto Sans Italic'],
}

async function main() {
    const starts = new Set()
    for (const [name, [path, noto]] of Object.entries(fonts)) {
        const font = fs.readFileSync(path)
        const [face] = await load(font)
        const fontStarts = [...new Set(face.points.map(p => p - (p % 256)))].sort((a, b) => a - b)
        fs.mkdirSync(`fonts/${name}`, { recursive: true })
        for (const start of fontStarts) {
            starts.add(start)
            const file = `${start}-${start + 255}.pbf`
            const jost = await range({ font, start, end: start + 255 })
            const response = await fetch(`https://tiles.openfreemap.org/fonts/${encodeURIComponent(noto)}/${file}`)
            const glyphs = response.ok ? await composite([jost, Buffer.from(await response.arrayBuffer())]) : jost
            fs.writeFileSync(`fonts/${name}/${file}`, glyphs)
        }
        console.log(name, fontStarts.length, 'ranges')
    }
    fs.writeFileSync('fonts/ranges.json', JSON.stringify([...starts].sort((a, b) => a - b)))
}

main()
