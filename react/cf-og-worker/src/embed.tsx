/*
 * The embed layout, as a satori element tree. Satori supports a flexbox subset of CSS and no
 * canvas, so this is a purpose-built card rather than a rendering of the real page. The values in
 * it still come from the site's own renderers.
 */
import React, { ReactElement, ReactNode, cloneElement, isValidElement } from 'react'

import { percentileSuffix } from '../../src/components/display-stats'
import { renderQuantity } from '../../src/components/unit-display'
import flagDimensions from '../../src/data/flag_dimensions'
import { canonicalWidth } from '../../src/mapper/map-rendering'
import { colorThemes } from '../../src/page_template/color-themes'
import { colorFromCycle } from '../../src/page_template/colors'
import { pieSlicePath, pieSlices } from '../../src/syau/cluster-geometry'
import { Inset } from '../../src/urban-stats-script/constants/insets'
import { mixWithBackground } from '../../src/utils/color'
import { computeAspectRatioForInsets } from '../../src/utils/coordinates'
import { HumanReadableName } from '../../src/utils/human-readable-element'
import { reifyString } from '../../src/utils/human-readable-name'
import { StoredUnit } from '../../src/utils/quantity'
import { classifyStatistic, unitTypeToStoredUnit } from '../../src/utils/unit'
import logoSvg from '../assets/logo.svg'

import { basemap } from './basemap'
import { Marker, clusterMarkers } from './clusters'
import { ArticleCard, ComparisonCard, MapCard, MapContents, StatisticCard, Units } from './data'
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

const logoImage = `data:image/svg+xml;utf8,${encodeURIComponent(logoSvg)}`

// Proportions measured off the screenshot footer, so the two lockups match. The mark stands taller
// than the text beside it, which is what sets the height of a footer it sits in.
const logoHeight = 1.5
const logoGap = 0.5

/** The site's name in the corner of a card, as the mark and the wordmark a PNG export carries. */
function wordmark(fontSize: number): ReactElement {
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src={logoImage} height={fontSize * logoHeight} />
            <div style={{ display: 'flex', marginLeft: fontSize * logoGap }}>urbanstats.org</div>
        </div>
    )
}

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

/**
 * A name the site renders through `reifyReact`, whose fragments satori has no equivalent of.
 * Satori lays smaller text out from the top of the line, so a subscript is dropped by hand.
 */
function humanReadable(name: HumanReadableName, fontSize: number): ReactNode[] {
    if (typeof name === 'string') {
        return [narrowSpaces(name)]
    }
    return name.flatMap((element, index): ReactNode[] => {
        switch (element.type) {
            case 'atom':
            case 'code':
                // Satori trims the whitespace where a text node meets an element, which a script
                // beside it makes of the name.
                return [narrowSpaces(element.value.replace(/^ | $/g, '\u00a0'))]
            case 'subscript':
            case 'superscript':
                return [(
                    <div
                        key={index}
                        style={{
                            display: 'flex',
                            fontSize: fontSize * 0.65,
                            marginTop: element.type === 'subscript' ? fontSize * 0.45 : 0,
                        }}
                    >
                        {humanReadable(element.value, fontSize * 0.65)}
                    </div>
                )]
            case 'where':
                return ['\u00a0where\u00a0', ...humanReadable(element.value, fontSize)]
            case 'parens':
                return ['(', ...humanReadable(element.value, fontSize), ')']
        }
    })
}

function formatValue(value: number, unit: StoredUnit, units: Units, fontSize: number): ReactNode[] {
    const rendered = renderQuantity(value, unit, { useImperial: units.use_imperial, temperatureUnit: units.temperature_unit }, { alone: true })
    // An array rather than a fragment, which satori does not have.
    return [
        keyed(styleBareTags(rendered.value, fontSize), 'value'),
        // The site sets these in separate table columns; here they would abut.
        <div key="gap" style={{ width: fontSize * 0.2 }} />,
        keyed(styleBareTags(rendered.unit, fontSize), 'unit'),
    ]
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
            <div style={{ width: 170, fontSize: 26, justifyContent: 'flex-end', display: 'flex' }}>{formatValue(stat.value, unitTypeToStoredUnit(classifyStatistic(stat.name)), units, 26)}</div>
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
    const unit = ramp.unit ?? unitTypeToStoredUnit(classifyStatistic(label))
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
    const footerFontSize = 20
    const footerGap = 6
    const boxWidth = width - padding * 2
    // Whatever the colourbar and footer leave. The label is the embed's title, not part of the card.
    const boxHeight = height - padding * 2 - (map.ramp === undefined ? 0 : 55) - (footerFontSize * logoHeight + footerGap)
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: footerFontSize, color: colors.muted, alignItems: 'center', marginTop: footerGap }}>
                {wordmark(footerFontSize)}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: colors.muted, alignItems: 'center' }}>
                {wordmark(24)}
                <div style={{ display: 'flex', fontSize: 18 }}>{rings.length === 0 ? '' : tileAttribution}</div>
            </div>
        </div>
    )
}

/** The regions' names carry the card, there being no title over them. */
const maxHeaderSize = 38

const footerSize = 24

function qualifierSize(headerSize: number): number {
    return Math.min(18, headerSize * 0.6)
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
// The regions' names are set semibold, whose average character is wider.
const boldCharacterWidth = 0.56
const lineHeight = 1.3

function linesTaken(text: string, columnWidth: number, fontSize: number, charWidth = characterWidth): number {
    const perLine = Math.max(1, Math.floor(columnWidth / (fontSize * charWidth)))
    let lines = 1
    let used = 0
    for (const word of text.split(' ')) {
        const withWord = used === 0 ? word.length : used + 1 + word.length
        if (withWord > perLine && used > 0) {
            lines += 1
            used = word.length
        }
        else {
            used = withWord
        }
    }
    return lines
}

/** The largest size at which the text wraps into no more lines than that, down to the floor. */
function sizeToFit(texts: string[], columnWidth: number, maxLines: number, max: number, min: number, charWidth = characterWidth): number {
    const fits = (text: string, size: number): boolean =>
        linesTaken(text, columnWidth, size, charWidth) <= maxLines
        // A word wider than the column overflows it rather than wrapping.
        && Math.max(...text.split(' ').map(word => word.length)) * size * charWidth <= columnWidth
    for (let size = max; size > min; size--) {
        if (texts.every(text => fits(text, size))) {
            return size
        }
    }
    return min
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

/** What a row needs at least. The rows share out whatever the table's fixed height leaves over. */
function rowHeight(stat: ComparisonCard['stats'][number], layout: TableLayout): number {
    const name = linesTaken(stat.name, layout.nameColumn - cellPadding, layout.nameSize) * layout.nameSize
    // Plus the rule above the row.
    return rowPadding * 2 + Math.max(name, layout.valueSize) * lineHeight + 2
}

function cellValue(value: number, unit: StoredUnit, units: Units, fontSize: number): ReactNode[] {
    // A geography the statistic has no value for, which the site's tables leave blank.
    return Number.isNaN(value) ? ['—'] : formatValue(value, unit, units, fontSize)
}

function comparisonRow(stat: ComparisonCard['stats'][number], index: number, layout: TableLayout, units: Units): ReactElement {
    const unit = unitTypeToStoredUnit(classifyStatistic(stat.name))
    return (
        <div
            key={stat.name}
            style={{
                display: 'flex',
                // Grown to share out what the rows do not fill, so the table ends where the map does.
                flex: 1,
                // Stretched, so a shaded winner fills its row rather than only the text in it.
                alignItems: 'stretch',
                lineHeight,
                borderTop: index === 0 ? `2px solid ${colors.text}` : `1px solid ${colors.rule}`,
            }}
        >
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', fontSize: layout.nameSize, padding: `${rowPadding}px ${cellPadding}px ${rowPadding}px 0` }}>{stat.name}</div>
            {layout.colors.map((color, region) => (
                <div
                    key={region}
                    style={{
                        display: 'flex',
                        width: layout.valueColumn,
                        fontSize: layout.valueSize,
                        padding: `${rowPadding}px ${cellPadding}px`,
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        // The largest value, shaded the way the comparison table shades it.
                        backgroundColor: stat.highlight === region ? mixWithBackground(color, theme.mixPct / 100, colors.background) : 'transparent',
                    }}
                >
                    {cellValue(stat.values[region], unit, units, layout.valueSize)}
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
                    <div style={{ display: 'flex', fontSize: qualifierSize(layout.headerSize), color: colors.muted }}>{qualifier(region.shortname, region.longname)}</div>
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
    // The mark stands taller than the text beside it, so it is what the footer's height comes from.
    const body = height - padding.y * 2 - (footerSize * logoHeight + 20)
    const mapWidth = 420
    const mapGap = 32

    // Past this the table has no column to spare for one; the embed's tags still name them all.
    const regions = comparison.regions.slice(0, 5)
    const cycle = regions.map((_, index) => colorFromCycle(theme.hueColors, index))
    const drawn = regions.map((_, index) => ({ rings: shapes[index] ?? [], color: cycle[index] }))
    const withMap = regions.length <= mappedRegions && shareAMap(drawn.map(shape => shape.rings))

    const tableWidth = content - (withMap ? mapWidth + mapGap : 0)
    // The values take most of the table, the statistic names what is left of it. Both are capped,
    // so a comparison of two regions is a table across the middle rather than across the card.
    const valueColumn = Math.min(220, tableWidth * 0.62 / regions.length)
    const layout: TableLayout = {
        colors: cycle,
        nameColumn: Math.min(tableWidth - valueColumn * regions.length, 460),
        nameSize: 22,
        valueColumn,
        valueSize: Math.min(26, Math.round(valueColumn / 6.5)),
        headerSize: sizeToFit(regions.map(region => region.shortname), valueColumn - cellPadding * 2, 2, maxHeaderSize, 13, boldCharacterWidth),
    }

    const headerLines = Math.max(...regions.map(region => linesTaken(region.shortname, valueColumn - cellPadding * 2, layout.headerSize, boldCharacterWidth)))
    const columnHeaderHeight = (headerLines * layout.headerSize + qualifierSize(layout.headerSize)) * lineHeight + 6
    let budget = body - columnHeaderHeight

    const stats: ComparisonCard['stats'] = []
    for (const stat of comparison.stats) {
        const takes = rowHeight(stat, layout)
        if (takes > budget) {
            break
        }
        budget -= takes
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
            <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', width: layout.nameColumn + layout.valueColumn * regions.length, height: body, marginRight: withMap ? mapGap : 0 }}>
                    {comparisonHeader(regions, layout)}
                    {stats.map((stat, index) => comparisonRow(stat, index, layout, comparison.units))}
                </div>
                {withMap ? await mapPanel(drawn, { width: mapWidth, height: body }, tileOrigin) : <div style={{ display: 'flex' }}></div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: footerSize, color: colors.muted, alignItems: 'center' }}>
                {wordmark(footerSize)}
                <div style={{ display: 'flex', fontSize: 18 }}>{withMap ? tileAttribution : ''}</div>
            </div>
        </div>
    )
}

/** The rank column, wide enough for four digits at the size the names are set. */
const rankColumn = 64
// What a row of the statistic table takes at most.
const maxRowHeight = 56

/** The arrow the page marks its sorted column with, drawn rather than fetched: it is one triangle. */
function sortArrow(order: 'ascending' | 'descending', size: number): ReactElement {
    const points = order === 'ascending'
        ? `0,${size} ${size},${size} ${size / 2},0`
        : `0,0 ${size},0 ${size / 2},${size}`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><polygon points="${points}" fill="${theme.brandingColor}"/></svg>`
    return (
        <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
            width={size}
            height={size}
            // Off the baseline, so it sits against the name rather than under it.
            style={{ marginLeft: size * 0.3, marginBottom: size * 0.35 }}
        />
    )
}

/**
 * The statistic table's top rows. Sized by hand for the same reason the comparison's is: satori
 * measures no text before it lays out.
 */
export function statisticEmbedCard(statistic: StatisticCard, { width, height }: { width: number, height: number }): ReactElement {
    installHooks()
    const padding = { x: 48, y: 36 }
    const content = width - padding.x * 2
    // Room for the flag beside it, as the article card's title leaves.
    const titleSize = sizeToFit([reifyString(statistic.title)], content - 140, 1, 54, 26, boldCharacterWidth)

    const valueColumn = Math.min(260, (content - rankColumn) * 0.62 / statistic.columns.length)
    const nameColumn = content - rankColumn - valueColumn * statistic.columns.length
    const names = statistic.rows.map(entry => entry.longname)
    // A name that fits on one line only at a size the rest of the table dwarfs takes two instead,
    // at whatever size two lines fit a row at.
    const nameSize = Math.max(
        sizeToFit(names, nameColumn - cellPadding, 1, 26, 14),
        sizeToFit(names, nameColumn - cellPadding, 2, Math.floor(maxRowHeight / (2 * lineHeight)), 14),
    )
    const valueSize = Math.min(28, Math.round(valueColumn / 6.5))
    /*
     * A table of several columns is titled by its own headers, so it drops the title and the flag
     * over it. A single column's header would only repeat the title, so that one keeps the title
     * and leaves the header out.
     */
    const columnHeaders = statistic.columns.length > 1
        ? sizeToFit(statistic.columns.map(column => reifyString(column.name)), valueColumn - cellPadding * 2, 2, 30, 14, boldCharacterWidth)
        : undefined
    // Which geographies these are, and which of them: what neither the title nor the headers say.
    const note = `${statistic.heading} in ${statistic.universe}${statistic.filter === undefined ? '' : ` where ${reifyString(statistic.filter)}`}`
    const noteSize = columnHeaders === undefined
        // Under the title, in whatever the flag beside it leaves.
        ? sizeToFit([note], content - 140, 1, 26, 14)
        // Over the names, which are what it qualifies.
        : sizeToFit([note], rankColumn + nameColumn - cellPadding, 2, 30, 14, boldCharacterWidth)
    const noteElements = [
        `${statistic.heading} in ${statistic.universe}`,
        ...(statistic.filter === undefined ? [] : ['\u00a0where\u00a0', ...humanReadable(statistic.filter, noteSize)]),
    ]

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
            {columnHeaders !== undefined
                ? <div style={{ display: 'flex' }}></div>
                : (
                        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 24, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 600, alignItems: 'flex-start' }}>{humanReadable(statistic.title, titleSize)}</div>
                                <div style={{ display: 'flex', fontSize: noteSize, color: colors.muted }}>{noteElements}</div>
                            </div>
                            {flag(statistic.universe, statistic.flag)}
                        </div>
                    )}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {columnHeaders === undefined
                    ? <div style={{ display: 'flex' }}></div>
                    : (
                            <div style={{ display: 'flex', alignItems: 'flex-end', lineHeight, paddingBottom: 6 }}>
                                <div style={{ display: 'flex', flex: 1, fontSize: noteSize, fontWeight: 600, paddingRight: cellPadding, overflow: 'hidden' }}>
                                    {noteElements}
                                </div>
                                {statistic.columns.map((column, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: 'flex',
                                            width: valueColumn,
                                            fontSize: columnHeaders,
                                            fontWeight: 600,
                                            padding: `0 ${cellPadding}px`,
                                            justifyContent: 'flex-end',
                                            textAlign: 'right',
                                            alignItems: 'flex-end',
                                        }}
                                    >
                                        {humanReadable(column.name, columnHeaders)}
                                        {index === statistic.sortColumn ? sortArrow(statistic.order, columnHeaders * 0.6) : ''}
                                    </div>
                                ))}
                            </div>
                        )}
                {statistic.rows.map((entry, index) => (
                    <div
                        key={entry.longname}
                        style={{
                            display: 'flex',
                            // Shared out over whatever the table's height leaves, up to the height
                            // a full page of rows would take: a short table sits at the top rather
                            // than stretching down the card.
                            flex: 1,
                            maxHeight: maxRowHeight,
                            alignItems: 'center',
                            lineHeight,
                            borderTop: index === 0 ? `2px solid ${colors.text}` : `1px solid ${colors.rule}`,
                        }}
                    >
                        <div style={{ display: 'flex', width: rankColumn, fontSize: nameSize, color: colors.muted, justifyContent: 'flex-end', paddingRight: cellPadding * 2 }}>
                            {entry.ordinal}
                        </div>
                        <div style={{ display: 'flex', flex: 1, fontSize: nameSize, overflow: 'hidden' }}>{narrowSpaces(entry.longname)}</div>
                        {statistic.columns.map((column, index2) => (
                            <div
                                key={index2}
                                style={{
                                    display: 'flex',
                                    width: valueColumn,
                                    fontSize: valueSize,
                                    padding: `0 ${cellPadding}px`,
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                }}
                            >
                                {cellValue(entry.values[index2], column.unit ?? unitTypeToStoredUnit(classifyStatistic(reifyString(column.name))), statistic.units, valueSize)}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', fontSize: footerSize, color: colors.muted, alignItems: 'center', marginTop: 20 }}>
                {wordmark(footerSize)}
            </div>
        </div>
    )
}
