/*
 * The embed layout, as a satori element tree. Satori supports a flexbox subset of CSS and no
 * canvas, so this is a purpose-built card rather than a rendering of the real page. The values in
 * it still come from the site's own renderers.
 */
import React, { ReactElement, ReactNode, cloneElement, isValidElement } from 'react'

import { getUnitDisplay } from '../../src/components/unit-display'
import flagDimensions from '../../src/data/flag_dimensions'
import { classifyStatistic } from '../../src/utils/unit'

import { basemap } from './basemap'
import { ArticleCard, Units } from './data'
import { MapLayout, Ring, fitRings, place } from './map-layout'

/*
 * Lets satori call the site's function components: React installs a hook dispatcher only while a
 * renderer is running, so without one every hook inside them throws. These resolve the way a first
 * render with no state changes would.
 */
/* eslint-disable no-restricted-syntax -- React's own names for its internals, which are deliberately absent from @types/react. */
interface ReactInternals {
    __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: { ReactCurrentDispatcher: { current: unknown } }
}

interface ReactContext {
    _currentValue: unknown
}
/* eslint-enable no-restricted-syntax */

// Not at module scope: React's internals are not populated while the module graph is evaluating.
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

/* eslint-disable no-restricted-syntax -- The card is a fixed light image wherever it is unfurled, so it has no theme. */
const colors = {
    background: '#fff8f0',
    text: '#1e1e1e',
    muted: '#7a7268',
    rule: '#d8cfc4',
    shape: '#5a6ebd',
}
/* eslint-enable no-restricted-syntax */

// openfreemap's credit line, as its TileJSON states it.
const tileAttribution = 'OpenFreeMap © OpenMapTiles · Data from OpenStreetMap'

/** The basemap and the shape over it: satori renders images but not arbitrary SVG children. */
function mapImage(paint: string, rings: Ring[], layout: MapLayout, width: number, height: number): string {
    const d = rings
        .map(ring => `M${ring.map(point => place(layout, point).map(n => n.toFixed(1)).join(',')).join('L')}Z`)
        .join('')

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paint}`
        + `<path d="${d}" fill="${colors.shape}" fill-opacity="0.2" stroke="${colors.shape}" stroke-width="2.5" stroke-linejoin="round" fill-rule="evenodd"/></svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

async function mapPanel(rings: Ring[], { width, height }: { width: number, height: number }, tileOrigin: string): Promise<ReactElement> {
    const layout = fitRings(rings, width, height)
    const paint = await basemap(layout, width, height, tileOrigin)
    return (
        <div style={{ display: 'flex', overflow: 'hidden', width, height, flexShrink: 0, borderRadius: 5 }}>
            <img src={mapImage(paint, rings, layout, width, height)} width={width} height={height} />
        </div>
    )
}

function keyed(node: ReactNode, key: string | number): ReactNode {
    return isValidElement(node) ? cloneElement(node, { key }) : node
}

/**
 * Jost has no U+202F, the digit group separator, and satori renders a missing glyph as a 0.5em gap.
 * Spacer elements instead.
 */
function narrowSpaces(text: string): ReactNode {
    const parts = text.split('\u202f')
    if (parts.length === 1) {
        return text
    }
    return parts.flatMap((part, index) => index === 0 ? [part] : [<div key={index} style={{ width: '0.2em' }} />, part])
}

/**
 * Satori has no user-agent stylesheet, so presentational tags arrive unstyled -- `<sup>2</sup>`
 * would render as a full-size "2". Restores the ones the site uses.
 */
function styleBareTags(node: ReactNode): ReactNode {
    if (Array.isArray(node)) {
        return (node as ReactNode[]).map((child, index) => keyed(styleBareTags(child), index))
    }
    if (typeof node === 'string') {
        return narrowSpaces(node)
    }
    if (!isValidElement(node)) {
        return node
    }
    const children = styleBareTags((node.props as { children?: ReactNode }).children)
    if (node.type === 'sup') {
        // In px because satori's transform only accepts absolute lengths.
        return <span style={{ fontSize: 17, transform: 'translateY(-8px)' }}>{children}</span>
    }
    return cloneElement(node, undefined, children)
}

function formatValue({ name, value }: ArticleCard['stats'][number], units: Units): ReactNode[] {
    const rendered = getUnitDisplay(classifyStatistic(name)).renderValue(value, units.use_imperial, units.temperature_unit)
    // An array rather than a fragment, which satori does not have.
    return [keyed(styleBareTags(rendered.value), 'value'), keyed(styleBareTags(rendered.unit), 'unit')]
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

/** Sized the way the header's flag is: a fixed height, with the site's cap on a wide flag. */
function flag(article: ArticleCard): ReactElement {
    if (article.flag === undefined) {
        return <div style={{ display: 'flex' }}></div>
    }
    const aspectRatio = flagDimensions[article.universe]
    const width = 76 * Math.min(aspectRatio, 1.8)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <img src={article.flag} width={width} height={width / aspectRatio} />
            <div style={{ display: 'flex', fontSize: 16, color: colors.muted, marginTop: 6 }}>UNIVERSE</div>
        </div>
    )
}

export async function embedCard(article: ArticleCard, rings: Ring[], { width, height }: { width: number, height: number }, tileOrigin: string): Promise<ReactElement> {
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
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 24, overflow: 'hidden' }}>
                    <div style={{ fontSize: 60, fontWeight: 600 }}>{article.shortname}</div>
                    <div style={{ fontSize: 26, color: colors.muted }}>{article.longname}</div>
                </div>
                {flag(article)}
            </div>
            <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 32 }}>
                    {article.stats.map((stat, index) => row(stat, index, article.units))}
                </div>
                {rings.length === 0 ? <div style={{ display: 'flex' }}></div> : await mapPanel(rings, mapSize, tileOrigin)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: colors.muted, alignItems: 'baseline' }}>
                <div style={{ display: 'flex' }}>urbanstats.org</div>
                <div style={{ display: 'flex', fontSize: 18 }}>{rings.length === 0 ? '' : tileAttribution}</div>
            </div>
        </div>
    )
}
