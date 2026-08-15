/*
 * The embed layout, as a satori element tree.
 *
 * Satori supports a flexbox subset of CSS and no canvas, so this is a purpose-built card rather
 * than a rendering of the real page. It carries the same numbers, in the site's font and colours.
 */

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

function formatValue({ name, value }) {
    if (name === 'Population') {
        return value >= 1e6 ? `${(value / 1e6).toPrecision(3)}m` : `${(value / 1e3).toPrecision(3)}k`
    }
    if (name === 'Area') {
        return `${Number(value.toPrecision(3)).toLocaleString('en-US')} km²`
    }
    if (name === 'Compactness') {
        return value.toPrecision(3)
    }
    return `${Number(value.toPrecision(4)).toLocaleString('en-US')}/km²`
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
            { type: 'div', props: { style: { width: 150, fontSize: 26, justifyContent: 'flex-end', display: 'flex' }, children: formatValue(stat) } },
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
