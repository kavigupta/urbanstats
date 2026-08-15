/*
 * The embed layout, as a satori element tree.
 *
 * Satori supports a flexbox subset of CSS and no canvas, so the layout is a purpose-built card
 * rather than a rendering of the real page. The values inside it are not ours though: they come
 * from the site's own renderers, so the numbers cannot drift from the page they describe.
 */
import { formatToSignificantFigures, separateNumber } from '../../react/src/utils/text.ts'
import { classifyStatistic } from '../../react/src/utils/unit.ts'

const colors = {
    background: '#fff8f0',
    text: '#1e1e1e',
    muted: '#7a7268',
    rule: '#d8cfc4',
    shape: '#5a6ebd',
}

// Web Mercator, which is what the site's maps use, so shapes keep the shape people expect.
function project([lon, lat]) {
    const x = (lon + 180) / 360
    const clamped = Math.max(-85.05, Math.min(85.05, lat)) * Math.PI / 180
    const y = (1 - Math.log(Math.tan(clamped) + 1 / Math.cos(clamped)) / Math.PI) / 2
    return [x, y]
}

/**
 * The rings as one SVG path, fitted to the box. Returned as a data URI because satori renders
 * images but not arbitrary SVG children.
 */
function mapImage(rings, width, height) {
    const projected = rings.map(ring => ring.map(coord => project([coord.lon, coord.lat])))
    const xs = projected.flat().map(p => p[0])
    const ys = projected.flat().map(p => p[1])
    const [minX, maxX] = [Math.min(...xs), Math.max(...xs)]
    const [minY, maxY] = [Math.min(...ys), Math.max(...ys)]

    const pad = 8
    const scale = Math.min((width - pad * 2) / (maxX - minX || 1), (height - pad * 2) / (maxY - minY || 1))
    const offsetX = (width - (maxX - minX) * scale) / 2
    const offsetY = (height - (maxY - minY) * scale) / 2
    const place = ([x, y]) => [
        ((x - minX) * scale + offsetX).toFixed(1),
        ((y - minY) * scale + offsetY).toFixed(1),
    ]

    const d = projected
        .map(ring => `M${ring.map(point => place(point).join(',')).join('L')}Z`)
        .join('')

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
        + `<path d="${d}" fill="${colors.shape}" fill-opacity="0.45" stroke="${colors.shape}" stroke-width="1.5" stroke-linejoin="round" fill-rule="evenodd"/>`
        + '</svg>'
    return `data:image/svg+xml;base64,${btoa(svg)}`
}

/*
 * Mirrors the site's own value rendering, using its classifier and its separator so numbers read
 * the same -- notably the narrow no-break space in "6 850" rather than a comma.
 *
 * The tiering below duplicates getUnitDisplay, which cannot be imported here: it lives in a .tsx
 * module whose import graph drags in katex and the webfonts. Splitting the pure renderers out of
 * that module would let this go away entirely.
 */
function formatValue({ name, value }) {
    switch (classifyStatistic(name)) {
        case 'population':
            if (value >= 999.5e6) {
                return `${(value / 1e9).toPrecision(3)}B`
            }
            return value >= 999.5e3 ? `${(value / 1e6).toPrecision(3)}m` : `${(value / 1e3).toPrecision(3)}k`
        case 'density': {
            const places = value > 10 ? 0 : (value > 1 ? 1 : 2)
            return `${separateNumber(value.toFixed(places))}/km²`
        }
        case 'area':
            return `${separateNumber(formatToSignificantFigures(value))} km²`
        default:
            return formatToSignificantFigures(value)
    }
}

const ordinalSuffix = (n) => {
    const rem100 = n % 100
    if (rem100 >= 11 && rem100 <= 13) {
        return 'th'
    }
    return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
}

const row = (stat, index) => ({
    type: 'div',
    props: {
        style: {
            display: 'flex',
            alignItems: 'center',
            padding: '10px 0',
            borderTop: index === 0 ? `2px solid ${colors.text}` : `1px solid ${colors.rule}`,
        },
        children: [
            { type: 'div', props: { style: { flex: 1, fontSize: 24 }, children: stat.name } },
            { type: 'div', props: { style: { width: 170, fontSize: 26, justifyContent: 'flex-end', display: 'flex' }, children: formatValue(stat) } },
            {
                type: 'div',
                props: {
                    style: { width: 60, fontSize: 20, color: colors.muted, justifyContent: 'flex-end', display: 'flex' },
                    children: `${stat.percentile}${ordinalSuffix(stat.percentile)}`,
                },
            },
        ],
    },
})

export function embedCard(article, rings, { width, height }) {
    const mapSize = { width: 380, height: 340 }
    return {
        type: 'div',
        props: {
            style: {
                width,
                height,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: colors.background,
                color: colors.text,
                fontFamily: 'Jost',
                padding: '36px 48px',
            },
            children: [
                { type: 'div', props: { style: { fontSize: 60, fontWeight: 600 }, children: article.shortname } },
                { type: 'div', props: { style: { fontSize: 26, color: colors.muted, marginBottom: 16 }, children: article.longname } },
                {
                    // Stats and map side by side, so neither has to fit in the other's leftovers.
                    type: 'div',
                    props: {
                        style: { display: 'flex', flex: 1, alignItems: 'flex-start' },
                        children: [
                            { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 32 }, children: article.stats.map(row) } },
                            rings.length === 0
                                ? { type: 'div', props: { style: { display: 'flex' }, children: '' } }
                                : { type: 'img', props: { src: mapImage(rings, mapSize.width, mapSize.height), ...mapSize } },
                        ],
                    },
                },
                { type: 'div', props: { style: { display: 'flex', fontSize: 24, color: colors.muted }, children: 'urbanstats.org' } },
            ],
        },
    }
}
