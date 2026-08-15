/*
 * The embed layout, as a satori element tree.
 *
 * Satori supports a flexbox subset of CSS and no canvas, so the layout is a purpose-built card
 * rather than a rendering of the real page. The values inside it are not ours though: they come
 * from the site's own renderers, so the numbers cannot drift from the page they describe.
 */
// Deliberately the site's React, by path. og-worker has its own copy at a different major, and the
// dispatcher has to be installed on the instance the site's components actually call hooks through.
import * as siteReact from '../../react/node_modules/react/index.js'

import { getUnitDisplay } from '../../react/src/components/unit-display.tsx'
import { classifyStatistic } from '../../react/src/utils/unit.ts'

/*
 * Lets satori call the site's function components.
 *
 * Most unit displays hand back plain elements, but the election ones return <PartyPercentage/>,
 * which reads the party hues out of useColors(). Satori calls the component; React installs a hook
 * dispatcher only while a renderer is running, so without one every hook inside it throws.
 *
 * These resolve the way a first render with no state changes would. Installed on first use rather
 * than at module scope, because React's internals are not populated yet while the module graph is
 * still evaluating.
 */
function installHooks() {
    const dispatcher = siteReact.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher
    if (dispatcher.current !== null) {
        return
    }
    dispatcher.current = {
        useContext: context => context._currentValue,
        useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
        useReducer: (reducer, initial) => [initial, () => {}],
        useMemo: factory => factory(),
        useCallback: callback => callback,
        useRef: initial => ({ current: initial }),
        useEffect: () => {},
        useLayoutEffect: () => {},
        useDebugValue: () => {},
        useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
        useId: () => 'og',
    }
}

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
 * The site's own value rendering, not an imitation of it. `renderValue` hands back React elements,
 * which is exactly what satori consumes, so the separators, significant figures and unit tiers are
 * whatever the page uses -- including when they change.
 */
/**
 * Satori has no user-agent stylesheet, so tags whose meaning is purely presentational arrive
 * unstyled -- `<sup>2</sup>` would render as a full-size "2". Restores the ones the site uses.
 */
function styleBareTags(node) {
    if (Array.isArray(node)) {
        return node.map(styleBareTags)
    }
    if (node === null || typeof node !== 'object' || node.props === undefined) {
        return node
    }
    const children = styleBareTags(node.props.children)
    if (node.type === 'sup') {
        // Satori's transform only accepts absolute lengths, so the raise is in px against the
        // font size the stat value is rendered at.
        return { type: 'span', props: { style: { fontSize: 17, transform: 'translateY(-8px)' }, children } }
    }
    return { ...node, props: { ...node.props, children } }
}

function formatValue({ name, value }, units) {
    // renderValue takes the unit preferences separately from the value, and `?s` carries both, so
    // dropping them here would silently pin every card to Fahrenheit and metric.
    const rendered = getUnitDisplay(classifyStatistic(name)).renderValue(value, units.use_imperial, units.temperature_unit)
    return [styleBareTags(rendered.value), styleBareTags(rendered.unit)]
}

const ordinalSuffix = (n) => {
    const rem100 = n % 100
    if (rem100 >= 11 && rem100 <= 13) {
        return 'th'
    }
    return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
}

const row = (stat, index, units) => ({
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
            { type: 'div', props: { style: { width: 170, fontSize: 26, justifyContent: 'flex-end', display: 'flex' }, children: formatValue(stat, units) } },
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
    installHooks()
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
                            { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 32 }, children: article.stats.map((stat, index) => row(stat, index, article.units)) } },
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
