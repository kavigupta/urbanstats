/*
 * The embed layout, as a satori element tree. Satori supports a flexbox subset of CSS and no
 * canvas, so this is a purpose-built card rather than a rendering of the real page. The values in
 * it still come from the site's own renderers.
 */
import React, { ReactElement, ReactNode, cloneElement, isValidElement } from 'react'

import { percentileSuffix } from '../../src/components/display-stats'
import { getUnitDisplay } from '../../src/components/unit-display'
import flagDimensions from '../../src/data/flag_dimensions'
import { canonicalWidth } from '../../src/mapper/map-rendering'
import { colorThemes } from '../../src/page_template/color-themes'
import { colorFromCycle } from '../../src/page_template/colors'
import { pieSlicePath, pieSlices } from '../../src/syau/cluster-geometry'
import { Inset } from '../../src/urban-stats-script/constants/insets'
import { mixWithBackground } from '../../src/utils/color'
import { computeAspectRatioForInsets } from '../../src/utils/coordinates'
import { UnitType, classifyStatistic } from '../../src/utils/unit'

import { basemap } from './basemap'
import { Marker, clusterMarkers } from './clusters'
import { ArticleCard, ComparisonCard, MapCard, MapContents, Units } from './data'
import { Bounds, MapLayout, Ring, fitBounds, fitRings, place, polyline, projectedBounds, withinBox } from './map-layout'

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

// The card is a fixed image wherever it is unfurled, so it takes the light theme rather than a
// viewer's. The rest of its palette is its own: the card has no counterpart on the site to take
// them from.
const theme = colorThemes['Light Mode']

/* eslint-disable no-restricted-syntax -- Only the ones the site has no colour for. */
const colors = {
    background: theme.background,
    text: '#1e1e1e',
    muted: '#7a7268',
    rule: '#d8cfc4',
    shape: '#5a6ebd',
    insetBorder: theme.mapInsetBorderColor,
}
/* eslint-enable no-restricted-syntax */

// insetBorderWidth in map-common, which the Worker cannot import: it would pull maplibre in.
const insetBorderWidth = 2

// openfreemap's credit line, as its TileJSON states it.
const tileAttribution = 'OpenFreeMap © OpenMapTiles · Data from OpenStreetMap'

/** The whole map as one image: satori renders images but not arbitrary SVG children. */
function mapImage(content: string, width: number, height: number): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** One map fitted around every shape on it, each drawn in its own colour. */
async function mapPanel(shapes: { rings: Ring[], color: string }[], { width, height }: { width: number, height: number }, tileOrigin: string): Promise<ReactElement> {
    const layout = fitRings(shapes.flatMap(shape => shape.rings), width, height)
    const paint = await basemap(layout, width, height, tileOrigin)
    const drawn = shapes
        .map(({ rings, color }) => ({ color, d: rings.map(ring => ringPath(ring, layout, width, height)).join('') }))
        .filter(shape => shape.d !== '')
        .map(shape => `<path d="${shape.d}" fill="${shape.color}" fill-opacity="0.2" stroke="${shape.color}" stroke-width="2.5" stroke-linejoin="round" fill-rule="evenodd"/>`)
        .join('')
    return (
        <div style={{ display: 'flex', overflow: 'hidden', width, height, flexShrink: 0, borderRadius: 5 }}>
            <img src={mapImage(`${paint.under}${drawn}`, width, height)} width={width} height={height} />
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
function styleBareTags(node: ReactNode, fontSize: number): ReactNode {
    if (Array.isArray(node)) {
        return (node as ReactNode[]).map((child, index) => keyed(styleBareTags(child, fontSize), index))
    }
    if (typeof node === 'string') {
        return narrowSpaces(node)
    }
    if (!isValidElement(node)) {
        return node
    }
    const children = styleBareTags((node.props as { children?: ReactNode }).children, fontSize)
    if (node.type === 'sup') {
        // Satori lays smaller text out from the top of the line, which is already where a
        // superscript goes. In px because its font size does not inherit an em.
        return <span style={{ fontSize: fontSize * 0.65 }}>{children}</span>
    }
    return cloneElement(node, undefined, children)
}

function formatValue(value: number, unit: UnitType, units: Units, fontSize: number): ReactNode[] {
    const rendered = getUnitDisplay(unit).renderValue(value, units.use_imperial, units.temperature_unit)
    // An array rather than a fragment, which satori does not have.
    return [keyed(styleBareTags(rendered.value, fontSize), 'value'), keyed(styleBareTags(rendered.unit, fontSize), 'unit')]
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
            <div style={{ width: 170, fontSize: 26, justifyContent: 'flex-end', display: 'flex' }}>{formatValue(stat.value, classifyStatistic(stat.name), units, 26)}</div>
            <div style={{ width: 60, fontSize: 20, color: colors.muted, justifyContent: 'flex-end', display: 'flex' }}>
                {`${stat.percentile}${percentileSuffix(stat.percentile)}`}
            </div>
        </div>
    )
}

/** Sized the way the header's flag is: a fixed height, with the site's cap on a wide flag. */
function flag(universe: string, image: string | undefined): ReactElement {
    if (image === undefined) {
        return <div style={{ display: 'flex' }}></div>
    }
    const aspectRatio = flagDimensions[universe]
    const width = 76 * Math.min(aspectRatio, 1.8)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <img src={image} width={width} height={width / aspectRatio} />
            <div style={{ display: 'flex', fontSize: 16, color: colors.muted, marginTop: 6 }}>UNIVERSE</div>
        </div>
    )
}

/** Where an inset sits in the map container, in the pixels of the card rather than fractions. */
function insetBox(inset: Inset, width: number, height: number): { left: number, top: number, width: number, height: number } {
    return {
        left: inset.bottomLeft[0] * width,
        // Inset coordinates count up from the bottom; the card's box counts down from the top.
        top: (1 - inset.topRight[1]) * height,
        width: (inset.topRight[0] - inset.bottomLeft[0]) * width,
        height: (inset.topRight[1] - inset.bottomLeft[1]) * height,
    }
}

function ringPath(ring: Ring, layout: MapLayout, width: number, height: number): string {
    return polyline(ring.map(point => place(layout, point)), width, height, true)
}

function shapesSvg(contents: MapContents & { kind: 'shapes' }, opacity: number, layout: MapLayout, width: number, height: number): string {
    return contents.shapes
        .map(shape => ({
            fill: shape.fill,
            d: shape.rings.map(ring => ringPath(ring, layout, width, height)).join(''),
        }))
        .filter(shape => shape.d !== '')
        .map(shape => `<path d="${shape.d}" fill="${shape.fill}" fill-opacity="${opacity}" stroke="${contents.outline.color}" stroke-width="${contents.outline.weight}" stroke-linejoin="round" fill-rule="evenodd"/>`)
        .join('')
}

function pointsSvg(contents: MapContents & { kind: 'points' }, opacity: number, layout: MapLayout, scale: number, width: number, height: number): string {
    return contents.points
        .flatMap((point) => {
            const [x, y] = place(layout, [point.lon, point.lat])
            const radius = point.radius * scale
            if (!withinBox(x, y, radius, width, height)) {
                return []
            }
            return [`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(1)}" fill="${point.fill}" fill-opacity="${opacity}"/>`]
        })
        .join('')
}

function clustersSvg(contents: MapContents & { kind: 'clusters' }, markers: Marker[], opacity: number, layout: MapLayout, scale: number, width: number, height: number): string {
    return markers
        .flatMap((marker) => {
            const [cx, cy] = place(layout, [marker.lon, marker.lat])
            const radius = marker.radius * scale
            if (!withinBox(cx, cy, radius, width, height)) {
                return []
            }
            const slices = pieSlices(marker.byCategory).map(slice =>
                `<path d="${pieSlicePath(cx, cy, radius, slice.from, slice.to)}" fill="${contents.categoryColors[slice.category]}"/>`)
            return [`<g opacity="${opacity}">${slices.join('')}</g>`]
        })
        .join('')
}

/** Undefined for an inset nothing lands in, which the site leaves out rather than drawing empty. */
async function insetImage(map: MapCard, inset: Inset, box: { width: number, height: number }, layout: MapLayout, markers: Marker[], scale: number, tileOrigin: string): Promise<ReactElement | undefined> {
    const { width, height } = box

    let drawn
    switch (map.contents.kind) {
        case 'shapes':
            drawn = shapesSvg(map.contents, map.opacity, layout, width, height)
            break
        case 'points':
            drawn = pointsSvg(map.contents, map.opacity, layout, scale, width, height)
            break
        case 'clusters':
            drawn = clustersSvg(map.contents, markers, map.opacity, layout, scale, width, height)
            break
    }
    if (drawn === '') {
        return undefined
    }

    const paint = map.basemap.type === 'none'
        ? { under: `<rect width="${width}" height="${height}" fill="${map.basemap.backgroundColor}"/>`, over: '' }
        : await basemap(layout, width, height, tileOrigin, inset.mainMap ? 12 : 4, map.basemap.subnationalOutlines)

    // A cluster's markers are DOM elements over the page's canvas, so no basemap line crosses them.
    const content = map.contents.kind === 'clusters'
        ? `${paint.under}${paint.over}${drawn}`
        : `${paint.under}${drawn}${paint.over}`

    return (
        <img
            src={mapImage(content, width, height)}
            width={width}
            height={height}
            style={inset.mainMap ? {} : { border: `${insetBorderWidth}px solid ${colors.insetBorder}` }}
        />
    )
}

function colorbar(ramp: NonNullable<MapCard['ramp']>, label: string, units: Units): ReactElement {
    const unit = ramp.unit ?? classifyStatistic(label)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
            <div style={{ display: 'flex' }}>
                {ramp.colors.map((color, index) => (
                    <div key={index} style={{ display: 'flex', flex: 1, height: 16, backgroundColor: color, margin: '0 1px' }} />
                ))}
            </div>
            <div style={{ display: 'flex', fontSize: 15, color: colors.muted }}>
                {ramp.ticks.map((tick, index) => (
                    <div key={index} style={{ display: 'flex', flex: 1, justifyContent: 'center' }}>{formatValue(tick, unit, units, 15)}</div>
                ))}
            </div>
        </div>
    )
}

export async function mapEmbedCard(map: MapCard, { width, height }: { width: number, height: number }, tileOrigin: string): Promise<ReactElement> {
    installHooks()
    const padding = 16
    const boxWidth = width - padding * 2
    // Whatever the colourbar and footer leave. The label is the embed's title, not part of the card.
    const boxHeight = height - padding * 2 - (map.ramp === undefined ? 0 : 55) - 28
    const aspectRatio = computeAspectRatioForInsets(map.insets)
    const container = boxWidth / boxHeight > aspectRatio
        ? { width: boxHeight * aspectRatio, height: boxHeight }
        : { width: boxWidth, height: boxWidth / aspectRatio }

    // The page lays its map out at a fixed width and scales the result; radii are in those pixels.
    const scale = container.width / canonicalWidth
    const boxes = map.insets.map((inset) => {
        const box = insetBox(inset, container.width, container.height)
        return { inset, box, layout: fitBounds(inset.coordBox, box.width, box.height) }
    })
    // Clustered together rather than per inset: a marker's radius is set against the largest on the
    // whole map, so no one inset can size its own.
    const markers = map.contents.kind === 'clusters' ? clusterMarkers(map.contents, boxes, scale) : undefined

    const insets = (await Promise.all(boxes.map(async ({ inset, box, layout }, index) => {
        const image = await insetImage(map, inset, box, layout, markers?.[index] ?? [], scale, tileOrigin)
        return image === undefined ? [] : [{ box, image }]
    }))).flat()

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
                padding: `${padding}px`,
            }}
        >
            <div style={{ display: 'flex', flex: 1, justifyContent: 'center' }}>
                <div style={{ display: 'flex', position: 'relative', ...container }}>
                    {insets.map(({ box, image }, index) => (
                        <div key={index} style={{ display: 'flex', position: 'absolute', ...box }}>{image}</div>
                    ))}
                </div>
            </div>
            {map.ramp === undefined ? <div style={{ display: 'flex' }}></div> : colorbar(map.ramp, map.label, map.units)}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: colors.muted, alignItems: 'baseline', marginTop: 6 }}>
                <div style={{ display: 'flex' }}>urbanstats.org</div>
                <div style={{ display: 'flex', fontSize: 16 }}>{map.basemap.type === 'none' ? '' : tileAttribution}</div>
            </div>
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
                {flag(article.universe, article.flag)}
            </div>
            <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 32 }}>
                    {article.stats.map((stat, index) => row(stat, index, article.units))}
                </div>
                {rings.length === 0 ? <div style={{ display: 'flex' }}></div> : await mapPanel([{ rings, color: colors.shape }], mapSize, tileOrigin)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: colors.muted, alignItems: 'baseline' }}>
                <div style={{ display: 'flex' }}>urbanstats.org</div>
                <div style={{ display: 'flex', fontSize: 18 }}>{rings.length === 0 ? '' : tileAttribution}</div>
            </div>
        </div>
    )
}

/** What the longname adds to the shortname -- the state and country a "Chicago city" is in. */
function qualifier(shortname: string, longname: string): string {
    return longname.startsWith(shortname) ? longname.slice(shortname.length).replace(/^,\s*/g, '') : longname
}

/*
 * Satori measures nothing before it lays out, so the comparison's table is fitted by hand: a column
 * per region is as narrow as the regions are many, and a row that overflowed would run through the
 * footer rather than being clipped. Jost's average character is about half its size wide.
 */
const characterWidth = 0.5
const lineHeight = 1.3

function linesTaken(text: string, columnWidth: number, fontSize: number): number {
    return Math.ceil(text.length / Math.max(1, Math.floor(columnWidth / (fontSize * characterWidth))))
}

/** The largest size at which the text stays on one line, or the floor if there is none. */
function sizeToFit(texts: string[], columnWidth: number, max: number, min: number): number {
    const longest = Math.max(1, ...texts.map(text => text.length))
    return Math.max(min, Math.min(max, Math.floor(columnWidth / (longest * characterWidth))))
}

interface TableLayout {
    colors: string[]
    nameColumn: number
    nameSize: number
    valueColumn: number
    valueSize: number
    headerSize: number
}

const cellPadding = 8
const rowPadding = 10

function rowHeight(stat: ComparisonCard['stats'][number], layout: TableLayout): number {
    const name = linesTaken(stat.name, layout.nameColumn - cellPadding, layout.nameSize) * layout.nameSize
    return rowPadding * 2 + Math.max(name, layout.valueSize) * lineHeight
}

function comparisonValue(value: number, unit: UnitType, units: Units, fontSize: number): ReactNode[] {
    // A region the statistic has no value for, which the comparison table leaves blank.
    return Number.isNaN(value) ? ['—'] : formatValue(value, unit, units, fontSize)
}

function comparisonRow(stat: ComparisonCard['stats'][number], index: number, layout: TableLayout, units: Units): ReactElement {
    const unit = classifyStatistic(stat.name)
    return (
        <div
            key={stat.name}
            style={{
                display: 'flex',
                alignItems: 'center',
                lineHeight,
                borderTop: index === 0 ? `2px solid ${colors.text}` : `1px solid ${colors.rule}`,
            }}
        >
            <div style={{ flex: 1, fontSize: layout.nameSize, padding: `${rowPadding}px ${cellPadding}px ${rowPadding}px 0` }}>{stat.name}</div>
            {layout.colors.map((color, region) => (
                <div
                    key={region}
                    style={{
                        display: 'flex',
                        width: layout.valueColumn,
                        fontSize: layout.valueSize,
                        padding: `${rowPadding}px ${cellPadding}px`,
                        justifyContent: 'flex-end',
                        // The largest value, shaded the way the comparison table shades it.
                        backgroundColor: stat.highlight === region ? mixWithBackground(color, theme.mixPct / 100, colors.background) : 'transparent',
                    }}
                >
                    {comparisonValue(stat.values[region], unit, units, layout.valueSize)}
                </div>
            ))}
        </div>
    )
}

function comparisonHeader(regions: ComparisonCard['regions'], layout: TableLayout): ReactElement {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', lineHeight, paddingBottom: 6 }}>
            <div style={{ display: 'flex', flex: 1 }}></div>
            {regions.map((region, index) => (
                <div
                    key={region.longname}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', width: layout.valueColumn, padding: `0 ${cellPadding}px` }}
                >
                    <div style={{ display: 'flex', fontSize: layout.headerSize, fontWeight: 600, color: layout.colors[index] }}>{region.shortname}</div>
                    <div style={{ display: 'flex', fontSize: layout.headerSize * 0.7, color: colors.muted }}>{qualifier(region.shortname, region.longname)}</div>
                </div>
            ))}
        </div>
    )
}

/** More regions than this and the table would rather have the map's width than the map. */
export const mappedRegions = 3

/**
 * Whether the regions belong on one map, by the same measure the comparison page's partitioner
 * uses: below it they are so far apart that a map fitted around them shows none of them.
 */
function shareAMap(shapes: Ring[][]): boolean {
    const boxes = shapes.flatMap((rings) => {
        const bounds = projectedBounds(rings)
        return bounds === undefined ? [] : [bounds]
    })
    const area = ({ minX, maxX, minY, maxY }: Bounds): number => (maxX - minX) * (maxY - minY)
    const around = boxes.reduce<Bounds | undefined>((all, box) => all === undefined
        ? box
        : { minX: Math.min(all.minX, box.minX), maxX: Math.max(all.maxX, box.maxX), minY: Math.min(all.minY, box.minY), maxY: Math.max(all.maxY, box.maxY) }, undefined)
    if (around === undefined || area(around) === 0) {
        return boxes.length > 0
    }
    // partitionLongnames' own threshold, which is what decides this on the page.
    return boxes.reduce((total, box) => total + area(box), 0) / area(around) >= 0.1
}

export async function comparisonEmbedCard(comparison: ComparisonCard, shapes: Ring[][], { width, height }: { width: number, height: number }, tileOrigin: string): Promise<ReactElement> {
    installHooks()
    const padding = { x: 48, y: 36 }
    const content = width - padding.x * 2
    const mapSize = { width: 380, height: 340 }
    const mapGap = 32

    // Past this the table has no column to spare for one; the embed's title still names them all.
    const regions = comparison.regions.slice(0, 5)
    const cycle = regions.map((_, index) => colorFromCycle(theme.hueColors, index))
    const drawn = regions.map((_, index) => ({ rings: shapes[index] ?? [], color: cycle[index] }))
    const withMap = regions.length <= mappedRegions && shareAMap(drawn.map(shape => shape.rings))

    const tableWidth = content - (withMap ? mapSize.width + mapGap : 0)
    // The values take most of the table, the statistic names what is left of it.
    const valueColumn = Math.min(220, tableWidth * 0.62 / regions.length)
    const layout: TableLayout = {
        colors: cycle,
        nameColumn: tableWidth - valueColumn * regions.length,
        nameSize: 22,
        valueColumn,
        valueSize: Math.min(26, Math.round(valueColumn / 6.5)),
        headerSize: sizeToFit(regions.map(region => region.shortname), valueColumn - cellPadding * 2, 20, 13),
    }

    const title = comparison.regions.map(region => region.shortname).join(' vs ')
    // Held clear of the flag, which the title wraps under rather than beside.
    const titleWidth = content - 140
    const titleSize = sizeToFit([title], titleWidth, 56, 26)
    const headerHeight = Math.max(linesTaken(title, titleWidth, titleSize) * titleSize * lineHeight, 98) + 12
    const columnHeaderHeight = layout.headerSize * 1.7 * lineHeight + 6
    let budget = height - padding.y * 2 - headerHeight - columnHeaderHeight - 24 * lineHeight

    const stats: ComparisonCard['stats'] = []
    for (const stat of comparison.stats) {
        budget -= rowHeight(stat, layout)
        if (budget < 0) {
            break
        }
        stats.push(stat)
    }

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
                padding: `${padding.y}px ${padding.x}px`,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 12 }}>
                <div style={{ display: 'flex', flex: 1, fontSize: titleSize, fontWeight: 600, paddingRight: 24, overflow: 'hidden' }}>{title}</div>
                {flag(comparison.universe, comparison.flag)}
            </div>
            <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: withMap ? mapGap : 0 }}>
                    {comparisonHeader(regions, layout)}
                    {stats.map((stat, index) => comparisonRow(stat, index, layout, comparison.units))}
                </div>
                {withMap ? await mapPanel(drawn, mapSize, tileOrigin) : <div style={{ display: 'flex' }}></div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: colors.muted, alignItems: 'baseline' }}>
                <div style={{ display: 'flex' }}>urbanstats.org</div>
                <div style={{ display: 'flex', fontSize: 18 }}>{withMap ? tileAttribution : ''}</div>
            </div>
        </div>
    )
}
