// Builds MapLibre glyphs for Jost, for the ranges Jost covers, with Noto filling in characters Jost lacks.
// Other ranges are left to OpenFreeMap's Noto glyphs, see transformRequest in temp.html.
// Needs fontnik (npm) and fontTools (python), which cuts fixed weights out of the variable font.
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { promisify } = require('util')
const fontnik = require('fontnik')

const load = promisify(fontnik.load)
const range = promisify(fontnik.range)
const composite = promisify(fontnik.composite)

const fontDir = '../population_density/react/src/fonts'
// name: [variable font, weight, Noto fallback]
const fonts = {
    'Jost Regular': ['Jost-VariableFont_wght.ttf', 400, 'Noto Sans Regular'],
    'Jost Medium': ['Jost-VariableFont_wght.ttf', 500, 'Noto Sans Regular'],
    'Jost Bold': ['Jost-VariableFont_wght.ttf', 700, 'Noto Sans Bold'],
    'Jost Italic': ['Jost-Italic-VariableFont_wght.ttf', 400, 'Noto Sans Italic'],
}

function instance(file, weight) {
    const out = path.join(os.tmpdir(), `${path.basename(file, '.ttf')}-${weight}.ttf`)
    execFileSync('python', ['-m', 'fontTools.varLib.instancer', path.join(fontDir, file), `wght=${weight}`, '-o', out])
    return fs.readFileSync(out)
}

async function main() {
    const starts = new Set()
    for (const [name, [file, weight, noto]] of Object.entries(fonts)) {
        const font = instance(file, weight)
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
