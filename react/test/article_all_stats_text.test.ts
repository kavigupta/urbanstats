import { checkAllCategoryBoxes, downloadCSV, saveString, urbanstatsFixture } from './test_utils'

function parseCSVRow(line: string): string[] {
    return Array.from(line.matchAll(/"((?:[^"]|"")*)"/g), match => match[1].replaceAll('""', '"'))
}

/** One `column: value` line per column, so a changed statistic is a one-line diff. */
function transposeCSV(csv: string): string {
    const [header, row] = csv.trim().split('\n').map(parseCSVRow)
    return header.map((column, i) => `${column}: ${row[i]}`).join('\n')
}

for (const [name, longname] of [
    ['california', 'California, USA'],
    ['zip-10001', '10001, USA'],
    ['detroit-urban-center', 'Detroit Urban Center, Canada-USA'],
    ['toronto-cma', 'Toronto CMA, ON, Canada'],
    ['india', 'India'],
]) {
    urbanstatsFixture(`all stats text ${name}`, `/article.html?longname=${encodeURIComponent(longname)}`)

    test(`${name}-all-stats-text`, async (t) => {
        await checkAllCategoryBoxes(t)
        saveString(t, transposeCSV(await downloadCSV(t)), `${name}-all-stats`, 'txt', false)
    })
}
