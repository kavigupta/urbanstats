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

import { Label, basemap, labelStyle } from './basemap'
import { ArticleCard, Units } from './data'
import { MapLayout, Ring, fitRings, place } from './map-layout'

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

// openfreemap's own credit line, as its TileJSON states it.
const tileAttribution = 'OpenFreeMap © OpenMapTiles · Data from OpenStreetMap'

/**
 * The basemap and the shape over it, as one SVG data URI: satori renders images but not arbitrary
 * SVG children, and one image beats a tile apiece because resvg then decodes one thing.
 */
function mapImage(paint: string, rings: Ring[], layout: MapLayout, width: number, height: number): string {
    const d = rings
        .map(ring => `M${ring.map(point => place(layout, point).map(n => n.toFixed(1)).join(',')).join('L')}Z`)
        .join('')

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paint}`
        + `<path d="${d}" fill="${colors.shape}" fill-opacity="0.2" stroke="${colors.shape}" stroke-width="2.5" stroke-linejoin="round" fill-rule="evenodd"/></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/**
 * Centred on its point by being placed half its estimated width to the left of it, since satori's
 * transforms take absolute lengths only and so cannot translate by a percentage of the text.
 */
function label({ name, x, y, size, width }: Label): ReactElement {
    return (
        <div key={`${name}${x}`} style={{ position: 'absolute', left: x - width / 2, top: y - size, width, display: 'flex', justifyContent: 'center' }}>
            <div style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: size, color: labelStyle.color, textShadow: `0 0 3px ${labelStyle.halo}` }}>{name}</div>
        </div>
    )
}

async function mapPanel(rings: Ring[], { width, height }: { width: number, height: number }): Promise<ReactElement> {
    const layout = fitRings(rings, width, height)
    const { paint, labels } = await basemap(layout, width, height)
    return (
        <div style={{ display: 'flex', position: 'relative', overflow: 'hidden', width, height, flexShrink: 0, borderRadius: 5 }}>
            <img style={{ position: 'absolute', left: 0, top: 0 }} src={mapImage(paint, rings, layout, width, height)} width={width} height={height} />
            {labels.map(label)}
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
