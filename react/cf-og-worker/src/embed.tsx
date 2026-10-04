/*
 * A purpose-built card rather than the real page, since satori supports only a flexbox subset of CSS.
 * The values in it still come from the site's own renderers.
 */
import React, { ReactElement, ReactNode, cloneElement, isValidElement } from 'react'

import { percentileSuffix } from '../../src/components/display-stats'
import { tileAttribution } from '../../src/components/map-common-utils'
import { renderQuantity } from '../../src/components/unit-display'
import flagDimensions from '../../src/data/flag_dimensions'
import { canonicalWidth } from '../../src/mapper/map-rendering'
import { colorThemes } from '../../src/page_template/color-themes'
import { colorFromCycle } from '../../src/page_template/colors'
import { pieSlicePath, pieSlices } from '../../src/syau/cluster-geometry'
import { Inset } from '../../src/urban-stats-script/constants/insets'
import { TableCellValue } from '../../src/urban-stats-script/constants/table'
import { mixWithBackground } from '../../src/utils/color'
import { computeAspectRatioForInsets } from '../../src/utils/coordinates'
import { HumanReadableName } from '../../src/utils/human-readable-element'
import { reifyString } from '../../src/utils/human-readable-name'
import { UnitSettings, StoredUnit, writeQuantity } from '../../src/utils/quantity'
import { trimTrailingZeros } from '../../src/utils/text'
import { unitForStatistic, unitTypeToStoredUnit } from '../../src/utils/unit'
import logoSvg from '../assets/logo.svg'

import { basemap } from './basemap'
import { Marker, clusterMarkers } from './clusters'
import { ArticleCard, ComparisonCard, MapCard, MapContents, StatisticCard, Units } from './data'
import { Bounds, MapLayout, Ring, fitBounds, fitRings, place, polyline, projectedBounds, withinBox } from './map-layout'

/*
 * Lets satori call the site's function components, whose hooks throw without a renderer's dispatcher.
 * Each hook resolves as it would on a first render.
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

// The card is a fixed image, so it can't follow the viewer's theme.
const theme = colorThemes['Light Mode']

/* eslint-disable no-restricted-syntax -- Only the ones the site has no colour for. */
const colors = {
    background: theme.background,
    text: '#1e1e1e',
    muted: '#7a7268',
    rule: '#d8cfc4',
    shape: '#5a6ebd',
    insetBorder: theme.mapInsetBorderColor,
    mapBorder: theme.borderNonShadow,
}
/* eslint-enable no-restricted-syntax */

// Copies of insetBorderWidth in map-common and mapBorderWidth in screenshot, which would pull in maplibre.
const insetBorderWidth = 2
const mapBorderWidth = 1

const logoImage = `data:image/svg+xml;utf8,${encodeURIComponent(logoSvg)}`

// Measured off the screenshot footer, so the two match.
const logoHeight = 1.5
const logoGap = 0.5

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

const attributionSize = 12
const attributionHeight = 18

function attribution(width: number): ReactElement {
    return (
        <div style={{ display: 'flex', width, height: attributionHeight, alignItems: 'center', fontSize: attributionSize, color: colors.muted }}>
            {tileAttribution}
        </div>
    )
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
        <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ display: 'flex', overflow: 'hidden', width, height, flexShrink: 0, borderRadius: 5 }}>
                <img src={mapImage(`${paint.under}${drawn}`, width, height)} width={width} height={height} />
            </div>
            {attribution(width)}
        </div>
    )
}

function keyed(node: ReactNode, key: string | number): ReactNode {
    return isValidElement(node) ? cloneElement(node, { key }) : node
}

/** Jost has no U+202F (the digit group separator), which satori would render as a 0.5em gap. */
function narrowSpaces(text: string): ReactNode {
    const parts = text.split('\u202f')
    if (parts.length === 1) {
        return text
    }
    return parts.flatMap((part, index) => index === 0 ? [part] : [<div key={index} style={{ width: '0.2em' }} />, part])
}

/** Satori has no user-agent stylesheet, so without this `<sup>2</sup>` renders as a full-size "2". */
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
        // Satori already sets smaller text at the top of the line. In px because em doesn't inherit here.
        return <span style={{ fontSize: fontSize * 0.65 }}>{children}</span>
    }
    return cloneElement(node, undefined, children)
}

/** `reifyReact` without fragments, which satori lacks. Subscripts are lowered by hand since satori top-aligns smaller text. */
function humanReadable(name: HumanReadableName, fontSize: number, units: Units): ReactNode[] {
    if (typeof name === 'string') {
        return [narrowSpaces(name)]
    }
    return name.flatMap((element, index): ReactNode[] => {
        switch (element.type) {
            case 'atom':
            case 'code':
                // Satori trims whitespace where text meets an element, such as a neighbouring script.
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
                        {humanReadable(element.value, fontSize * 0.65, units)}
                    </div>
                )]
            case 'where':
                return ['\u00a0where\u00a0', ...humanReadable(element.value, fontSize, units)]
            case 'parens':
                return ['(', ...humanReadable(element.value, fontSize, units), ')']
            case 'quantity': {
                // writeQuantity rather than writtenPlainly, which would flatten mi^{2} into those
                // literal characters instead of leaving the exponent for the superscript case below
                const { renderedValue, unitName } = writeQuantity(element.value, element.unit, readerOf(units), 'afterNumber')
                return [narrowSpaces(trimTrailingZeros(renderedValue)), ...humanReadable(unitName, fontSize, units)]
            }
        }
    })
}

function readerOf(units: Units): UnitSettings {
    return { useImperial: units.use_imperial, temperatureUnit: units.temperature_unit }
}

function formatValue(value: number, unit: StoredUnit, units: Units, fontSize: number): ReactNode[] {
    const rendered = renderQuantity(value, unit, readerOf(units), 'inColumn')
    // An array rather than a fragment, which satori does not have.
    return [
        keyed(styleBareTags(rendered.value, fontSize), 'value'),
        // The site sets these in separate table columns; here they would abut.
        <div key="gap" style={{ width: fontSize * 0.2 }} />,
        keyed(styleBareTags(rendered.unit, fontSize), 'unit'),
    ]
}

const articleNameSize = 24
const articleValueSize = 26

function row(stat: ArticleCard['stats'][number], index: number, units: Units): ReactElement {
    return (
        <div
            key={stat.name}
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: `${rowPadding}px 0`,
                borderTop: index === 0 ? `2px solid ${colors.text}` : `1px solid ${colors.rule}`,
            }}
        >
            <div style={{ flex: 1, fontSize: articleNameSize }}>{stat.name}</div>
            <div style={{ width: 170, fontSize: articleValueSize, justifyContent: 'flex-end', display: 'flex' }}>{formatValue(stat.value, unitTypeToStoredUnit(unitForStatistic(stat.name)), units, articleValueSize)}</div>
            <div style={{ width: 60, fontSize: 20, color: colors.muted, justifyContent: 'flex-end', display: 'flex' }}>
                {`${stat.percentile}${percentileSuffix(stat.percentile)}`}
            </div>
        </div>
    )
}

/** Fixed height, with the header's cap on wide flags. */
function flagWidth(universe: string, image: string | undefined): number {
    return image === undefined ? 0 : 76 * Math.min(flagDimensions[universe], 1.8)
}

function flag(universe: string, image: string | undefined): ReactElement {
    if (image === undefined) {
        return <div style={{ display: 'flex' }}></div>
    }
    const width = flagWidth(universe, image)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <img src={image} width={width} height={width / flagDimensions[universe]} />
            <div style={{ display: 'flex', fontSize: 16, color: colors.muted, marginTop: 6 }}>UNIVERSE</div>
        </div>
    )
}

/** In card pixels. */
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

/** Undefined when nothing lands in the inset, which the site omits too. */
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

    // On the page, cluster markers are DOM elements above the whole canvas, basemap lines included.
    const content = map.contents.kind === 'clusters'
        ? `${paint.under}${paint.over}${drawn}`
        : `${paint.under}${drawn}${paint.over}`

    return (
        <img
            src={mapImage(content, width, height)}
            width={width}
            height={height}
            style={inset.mainMap
                ? { border: `${mapBorderWidth}px solid ${colors.mapBorder}` }
                : { border: `${insetBorderWidth}px solid ${colors.insetBorder}` }}
        />
    )
}

function colorbar(ramp: NonNullable<MapCard['ramp']>, label: string, units: Units): ReactElement {
    const unit = ramp.unit ?? unitTypeToStoredUnit('number')
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
    // The label is the embed's title, not part of the card.
    const boxHeight = height - padding * 2 - (map.ramp === undefined ? 0 : 55) - (footerFontSize * logoHeight + footerGap)
    const aspectRatio = computeAspectRatioForInsets(map.insets)
    const container = boxWidth / boxHeight > aspectRatio
        ? { width: boxHeight * aspectRatio, height: boxHeight }
        : { width: boxWidth, height: boxWidth / aspectRatio }

    // Radii are in the pixels of the page's fixed-width layout.
    const scale = container.width / canonicalWidth(aspectRatio)
    const boxes = map.insets.map((inset) => {
        const box = insetBox(inset, container.width, container.height)
        return { inset, box, layout: fitBounds(inset.coordBox, box.width, box.height) }
    })
    // Across all insets, since radii are scaled against the largest marker on the map.
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: footerFontSize, color: colors.muted, alignItems: 'baseline', marginTop: footerGap }}>
                {wordmark(footerFontSize)}
                <div style={{ display: 'flex', fontSize: attributionSize }}>{map.basemap.type === 'none' ? '' : tileAttribution}</div>
            </div>
        </div>
    )
}

export async function embedCard(article: ArticleCard, rings: Ring[], { width, height }: { width: number, height: number }, tileOrigin: string): Promise<ReactElement> {
    installHooks()
    const mapSize = { width: 380, height: 340 }
    const padding = { x: 48, y: 36 }
    const mapGap = 32
    const headerGap = 16
    const titleGap = 24
    const subtitleSize = 26
    const content = width - padding.x * 2

    // Shrunk rather than wrapped, since a second title line costs the table two rows.
    const titleWidth = content - titleGap - flagWidth(article.universe, article.flag)
    const titleSize = sizeToFit([article.shortname], titleWidth, 1, 60, 40, boldCharacterWidth)
    const titleLines = linesTaken(article.shortname, titleWidth, titleSize, boldCharacterWidth)

    const nameColumn = content - (rings.length === 0 ? 0 : mapSize.width) - mapGap - 170 - 60
    let budget = height - padding.y * 2 - (titleLines * titleSize + subtitleSize) * jostLineHeight
        - headerGap - footerSize * logoHeight
    const stats: ArticleCard['stats'] = []
    for (const stat of article.stats) {
        const name = linesTaken(stat.name, nameColumn, articleNameSize) * articleNameSize
        // Plus the rule above the row, which is thicker over the first.
        const takes = rowPadding * 2 + Math.max(name, articleValueSize) * jostLineHeight + (stats.length === 0 ? 2 : 1)
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
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: headerGap }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: titleGap, overflow: 'hidden' }}>
                    <div style={{ fontSize: titleSize, fontWeight: 600 }}>{article.shortname}</div>
                    <div style={{ fontSize: subtitleSize, color: colors.muted }}>{article.longname}</div>
                </div>
                {flag(article.universe, article.flag)}
            </div>
            <div style={{ display: 'flex', flex: 1, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: mapGap }}>
                    {stats.map((stat, index) => row(stat, index, article.units))}
                </div>
                {rings.length === 0 ? <div style={{ display: 'flex' }}></div> : await mapPanel([{ rings, color: colors.shape }], mapSize, tileOrigin)}
            </div>
            <div style={{ display: 'flex', fontSize: footerSize, color: colors.muted }}>
                {wordmark(footerSize)}
            </div>
        </div>
    )
}

/** The region names are the card's title. */
const maxHeaderSize = 38

const footerSize = 24

function qualifierSize(headerSize: number): number {
    return Math.min(18, headerSize * 0.6)
}

/** e.g. the state and country of "Chicago city" */
function qualifier(shortname: string, longname: string): string {
    return longname.startsWith(shortname) ? longname.slice(shortname.length).replace(/^,\s*/g, '') : longname
}

/*
 * Satori can't measure text, so tables are fitted by hand from Jost's average character width.
 * A row that overflowed would run into the footer rather than being clipped.
 */
const characterWidth = 0.5
const boldCharacterWidth = 0.56
const lineHeight = 1.3
// Jost's default
const jostLineHeight = 1.445

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

function cellValue(value: TableCellValue, unit: StoredUnit, units: Units, fontSize: number): ReactNode[] {
    if (typeof value === 'boolean') {
        return [value ? '\u2705' : '\u274c']
    }
    if (typeof value === 'string') {
        return [value]
    }
    // A geography the statistic has no value for, which the site's tables leave blank.
    return Number.isNaN(value) ? ['—'] : formatValue(value, unit, units, fontSize)
}

function comparisonRow(stat: ComparisonCard['stats'][number], index: number, layout: TableLayout, units: Units): ReactElement {
    const unit = unitTypeToStoredUnit(unitForStatistic(stat.name))
    return (
        <div
            key={stat.name}
            style={{
                display: 'flex',
                // So the table ends where the map does.
                flex: 1,
                // So a shaded winner fills its row rather than only its text.
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

/** Past this, the table needs the map's width more than the card needs the map. */
export const mappedRegions = 3

/** Whether a map fitted around the regions would show them, by the comparison page's measure. */
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
    // partitionLongnames' threshold
    return boxes.reduce((total, box) => total + area(box), 0) / area(around) >= 0.1
}

export async function comparisonEmbedCard(comparison: ComparisonCard, shapes: Ring[][], { width, height }: { width: number, height: number }, tileOrigin: string): Promise<ReactElement> {
    installHooks()
    const padding = { x: 48, y: 36 }
    const content = width - padding.x * 2
    // The logo is taller than the footer text, so it sets the footer's height.
    const body = height - padding.y * 2 - (footerSize * logoHeight + 20)
    const mapWidth = 420
    const mapGap = 32

    // More won't fit as columns. The embed's tags still name them all.
    const regions = comparison.regions.slice(0, 5)
    const cycle = regions.map((_, index) => colorFromCycle(theme.hueColors, index))
    const drawn = regions.map((_, index) => ({ rings: shapes[index] ?? [], color: cycle[index] }))
    const withMap = regions.length <= mappedRegions && shareAMap(drawn.map(shape => shape.rings))

    const tableWidth = content - (withMap ? mapWidth + mapGap : 0)
    // Capped so a two-region comparison doesn't stretch across the card.
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
            <div style={{ display: 'flex', fontSize: footerSize, color: colors.muted }}>
                {wordmark(footerSize)}
            </div>
        </div>
    )
}

/** The rank column, wide enough for four digits at the size the names are set. */
const rankColumn = 64
const maxRowHeight = 56

/** Drawn rather than fetched, being one triangle. */
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

/** Sized by hand, since satori can't measure text. */
export function statisticEmbedCard(statistic: StatisticCard, { width, height }: { width: number, height: number }): ReactElement {
    installHooks()
    const padding = { x: 48, y: 36 }
    const content = width - padding.x * 2
    // Leaves room for the flag.
    const titleSize = sizeToFit([reifyString(statistic.title, readerOf(statistic.units))], content - 140, 1, 54, 26, boldCharacterWidth)

    const valueColumn = Math.min(260, (content - rankColumn) * 0.62 / statistic.columns.length)
    const nameColumn = content - rankColumn - valueColumn * statistic.columns.length
    const names = statistic.rows.map(entry => entry.longname)
    // A name that fits one line only at a tiny size takes two lines instead.
    const nameSize = Math.max(
        sizeToFit(names, nameColumn - cellPadding, 1, 26, 14),
        sizeToFit(names, nameColumn - cellPadding, 2, Math.floor(maxRowHeight / (2 * lineHeight)), 14),
    )
    const valueSize = Math.min(28, Math.round(valueColumn / 6.5))
    // Several columns are labelled by headers instead of the title. A single column's header would
    // repeat the title, so it's left out.
    const columnHeaders = statistic.columns.length > 1
        ? sizeToFit(statistic.columns.map(column => reifyString(column.name, readerOf(statistic.units))), valueColumn - cellPadding * 2, 2, 30, 14, boldCharacterWidth)
        : undefined
    // The geographies and filter, which neither the title nor the headers say.
    const note = `${statistic.heading}${statistic.filter === undefined ? '' : ` where ${reifyString(statistic.filter, readerOf(statistic.units))}`}`
    const noteSize = columnHeaders === undefined
        // Under the title, beside the flag
        ? sizeToFit([note], content - 140, 1, 26, 14)
        // Over the names
        : sizeToFit([note], rankColumn + nameColumn - cellPadding, 2, 30, 14, boldCharacterWidth)
    const noteElements = [
        statistic.heading,
        ...(statistic.filter === undefined ? [] : ['\u00a0where\u00a0', ...humanReadable(statistic.filter, noteSize, statistic.units)]),
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
                                <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 600, alignItems: 'flex-start' }}>{humanReadable(statistic.title, titleSize, statistic.units)}</div>
                                <div style={{ display: 'flex', fontSize: noteSize, color: colors.muted }}>{noteElements}</div>
                            </div>
                            {statistic.universe === undefined ? <div style={{ display: 'flex' }}></div> : flag(statistic.universe, statistic.flag)}
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
                                        {humanReadable(column.name, columnHeaders, statistic.units)}
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
                            // Capped so a short table sits at the top rather than stretching down the card.
                            flex: 1,
                            maxHeight: maxRowHeight,
                            alignItems: 'center',
                            lineHeight,
                            borderTop: index === 0 ? `2px solid ${colors.text}` : `1px solid ${colors.rule}`,
                        }}
                    >
                        <div style={{ display: 'flex', width: rankColumn, fontSize: nameSize, color: colors.muted, justifyContent: 'flex-end', paddingRight: cellPadding * 2 }}>
                            {entry.ordinal ?? ''}
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
                                {cellValue(entry.values[index2], column.unit ?? unitTypeToStoredUnit('number'), statistic.units, valueSize)}
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
