/*
 * The embed layout, as a satori element tree.
 *
 * Satori supports a flexbox subset of CSS and no canvas, so the layout is a purpose-built card
 * rather than a rendering of the real page. The values inside it are not ours though: they come
 * from the site's own renderers, so the numbers cannot drift from the page they describe.
 */
import React, { ReactElement, ReactNode, cloneElement, isValidElement } from 'react'

import { getUnitDisplay } from '../../src/components/unit-display'
import { classifyStatistic } from '../../src/utils/unit'

import { ArticleCard, Ring, Units } from './data'

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
/* eslint-disable no-restricted-syntax -- React's own names for its internals, which are deliberately absent from @types/react. */
interface ReactInternals {
    __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: { ReactCurrentDispatcher: { current: unknown } }
}

interface ReactContext {
    _currentValue: unknown
}
/* eslint-enable no-restricted-syntax */

function installHooks(): void {
    const { ReactCurrentDispatcher: dispatcher } = (React as unknown as ReactInternals).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    if (dispatcher.current !== null) {
        return
    }
    dispatcher.current = {
        useContext: (context: ReactContext) => context._currentValue,
        useState: (initial: unknown) => [typeof initial === 'function' ? (initial as () => unknown)() : initial, () => undefined],
        useReducer: (reducer: unknown, initial: unknown) => [initial, () => undefined],
        useMemo: (factory: () => unknown) => factory(),
        useCallback: (callback: unknown) => callback,
        useRef: (initial: unknown) => ({ current: initial }),
        useEffect: () => undefined,
        useLayoutEffect: () => undefined,
        useDebugValue: () => undefined,
        useSyncExternalStore: (subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
        useId: () => 'og',
    }
}

/* eslint-disable no-restricted-syntax -- The card is a fixed light image wherever it is unfurled, so it has a palette rather than a theme. */
const colors = {
    background: '#fff8f0',
    text: '#1e1e1e',
    muted: '#7a7268',
    rule: '#d8cfc4',
    shape: '#5a6ebd',
}
/* eslint-enable no-restricted-syntax */

// Web Mercator, which is what the site's maps use, so shapes keep the shape people expect.
function project([lon, lat]: [number, number]): [number, number] {
    const x = (lon + 180) / 360
    const clamped = Math.max(-85.05, Math.min(85.05, lat)) * Math.PI / 180
    const y = (1 - Math.log(Math.tan(clamped) + 1 / Math.cos(clamped)) / Math.PI) / 2
    return [x, y]
}

/*
 * A basemap behind the shape, composited from raster tiles.
 *
 * The site's own maps are maplibre over openfreemap's vector tiles, which wants a GL context there
 * is none of here. These are the same OSM cartography as raster, placed by hand at the zoom the
 * shape fits, which is all a slippy map does anyway.
 */
const tileSize = 256
// Where OSM's standard style stops.
const maxZoom = 19
const tileAttribution = '© OpenStreetMap'

interface MapLayout {
    /** Box pixels per unit of projected space, chosen so the rings fill the box. */
    scale: number
    zoom: number
    /** The box's top-left corner, in that same scaled space. */
    originX: number
    originY: number
}

function fitRings(rings: Ring[], width: number, height: number): MapLayout {
    const projected = rings.flat().map(project)
    const xs = projected.map(p => p[0])
    const ys = projected.map(p => p[1])
    const [minX, maxX] = [Math.min(...xs), Math.max(...xs)]
    const [minY, maxY] = [Math.min(...ys), Math.max(...ys)]

    const pad = 8
    const fit = Math.min((width - pad * 2) / (maxX - minX || 1), (height - pad * 2) / (maxY - minY || 1))
    // Tiles only exist at whole zooms, so the nearest one renders near its own resolution and the
    // rest of the fit is taken up by scaling it.
    const zoom = Math.max(0, Math.min(maxZoom, Math.round(Math.log2(fit / tileSize))))
    // Past max zoom a small shape stops filling the box, rather than tiles being blown up to suit it.
    const scale = Math.min(fit, tileSize * 2 ** (zoom + 1))
    return {
        scale,
        zoom,
        originX: (minX + maxX) / 2 * scale - width / 2,
        originY: (minY + maxY) / 2 * scale - height / 2,
    }
}

async function fetchTile(zoom: number, x: number, y: number): Promise<string | undefined> {
    const response = await fetch(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`, {
        // OSM's tile policy wants an identifiable caller.
        headers: { 'user-agent': 'urbanstats-og (+https://urbanstats.org)' },
    }).catch(() => undefined)
    if (!response?.ok) {
        return undefined
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    // btoa takes a string, and spreading a whole tile's worth of bytes at once overflows the
    // argument limit.
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    }
    return `data:image/png;base64,${btoa(binary)}`
}

/** The tiles the box covers, as positioned images. Ones that fail to load are simply left out. */
async function tileImages(layout: MapLayout, width: number, height: number): Promise<ReactElement[]> {
    const tilePx = layout.scale / 2 ** layout.zoom
    const across = 2 ** layout.zoom
    const range = (origin: number, extent: number): number[] => {
        const first = Math.floor(origin / tilePx)
        const last = Math.floor((origin + extent) / tilePx)
        return Array.from({ length: last - first + 1 }, (_, i) => first + i)
    }

    const images = await Promise.all(
        range(layout.originX, width).flatMap(x => range(layout.originY, height).map(async (y): Promise<ReactElement | undefined> => {
            if (y < 0 || y >= across) {
                return undefined
            }
            // x wraps, the way a map that scrolls past the antimeridian does.
            const src = await fetchTile(layout.zoom, ((x % across) + across) % across, y)
            if (src === undefined) {
                return undefined
            }
            return (
                <img
                    key={`${x},${y}`}
                    style={{ position: 'absolute', left: x * tilePx - layout.originX, top: y * tilePx - layout.originY }}
                    src={src}
                    // The extra pixel covers the seam left when tilePx lands between pixels.
                    width={tilePx + 1}
                    height={tilePx + 1}
                />
            )
        })),
    )
    return images.filter(image => image !== undefined)
}

/**
 * The rings as one SVG path over the same layout. Returned as a data URI because satori renders
 * images but not arbitrary SVG children.
 */
function shapeImage(rings: Ring[], layout: MapLayout, width: number, height: number): string {
    const place = (point: [number, number]): string => {
        const [x, y] = project(point)
        return `${(x * layout.scale - layout.originX).toFixed(1)},${(y * layout.scale - layout.originY).toFixed(1)}`
    }
    const d = rings.map(ring => `M${ring.map(place).join('L')}Z`).join('')

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
        + `<path d="${d}" fill="${colors.shape}" fill-opacity="0.3" stroke="${colors.shape}" stroke-width="2.5" stroke-linejoin="round" fill-rule="evenodd"/>`
        + '</svg>'
    return `data:image/svg+xml;base64,${btoa(svg)}`
}

async function mapPanel(rings: Ring[], { width, height }: { width: number, height: number }): Promise<ReactElement> {
    const layout = fitRings(rings, width, height)
    return (
        <div
            style={{
                display: 'flex',
                position: 'relative',
                overflow: 'hidden',
                width,
                height,
                flexShrink: 0,
                borderRadius: 5,
                // Shows through wherever a tile did not arrive.
                backgroundColor: colors.rule,
            }}
        >
            {await tileImages(layout, width, height)}
            <img style={{ position: 'absolute', left: 0, top: 0 }} src={shapeImage(rings, layout, width, height)} width={width} height={height} />
        </div>
    )
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
function styleBareTags(node: ReactNode): ReactNode {
    if (Array.isArray(node)) {
        return node.map(styleBareTags)
    }
    if (!isValidElement(node)) {
        return node
    }
    const children = styleBareTags((node.props as { children?: ReactNode }).children)
    if (node.type === 'sup') {
        // Satori's transform only accepts absolute lengths, so the raise is in px against the
        // font size the stat value is rendered at.
        return <span style={{ fontSize: 17, transform: 'translateY(-8px)' }}>{children}</span>
    }
    return cloneElement(node, undefined, children)
}

function formatValue({ name, value }: ArticleCard['stats'][number], units: Units): ReactNode[] {
    // renderValue takes the unit preferences separately from the value, and `?s` carries both, so
    // dropping them here would silently pin every card to Fahrenheit and metric.
    const rendered = getUnitDisplay(classifyStatistic(name)).renderValue(value, units.use_imperial, units.temperature_unit)
    return [styleBareTags(rendered.value), styleBareTags(rendered.unit)]
}

function ordinalSuffix(n: number): string {
    const rem100 = n % 100
    if (rem100 >= 11 && rem100 <= 13) {
        return 'th'
    }
    return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
}

function row(stat: ArticleCard['stats'][number], index: number, units: Units): ReactElement {
    return (
        <div
            key={stat.name}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 0',
                borderTop: index === 0 ? `2px solid ${colors.text}` : `1px solid ${colors.rule}`,
            }}
        >
            <div style={{ flex: 1, fontSize: 24 }}>{stat.name}</div>
            <div style={{ width: 170, fontSize: 26, justifyContent: 'flex-end', display: 'flex' }}>{formatValue(stat, units)}</div>
            <div style={{ width: 60, fontSize: 20, color: colors.muted, justifyContent: 'flex-end', display: 'flex' }}>
                {`${stat.percentile}${ordinalSuffix(stat.percentile)}`}
            </div>
        </div>
    )
}

export async function embedCard(article: ArticleCard, rings: Ring[], { width, height }: { width: number, height: number }): Promise<ReactElement> {
    installHooks()
    const mapSize = { width: 380, height: 340 }
    return (
        <div
            style={{
                width,
                height,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: colors.background,
                color: colors.text,
                fontFamily: 'Jost',
                padding: '36px 48px',
            }}
        >
            <div style={{ fontSize: 60, fontWeight: 600 }}>{article.shortname}</div>
            <div style={{ fontSize: 26, color: colors.muted, marginBottom: 16 }}>{article.longname}</div>
            {/* Stats and map side by side, so neither has to fit in the other's leftovers. */}
            <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 32 }}>
                    {article.stats.map((stat, index) => row(stat, index, article.units))}
                </div>
                {rings.length === 0 ? <div style={{ display: 'flex' }}></div> : await mapPanel(rings, mapSize)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: colors.muted }}>
                <div style={{ display: 'flex' }}>urbanstats.org</div>
                <div style={{ display: 'flex', fontSize: 18 }}>{rings.length === 0 ? '' : tileAttribution}</div>
            </div>
        </div>
    )
}
