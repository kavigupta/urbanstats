import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import React, { ReactNode } from 'react'

import './map.css'

import { boundingBox, extendBoxes, geometry } from '../map-partition'
import { Basemap } from '../mapper/settings/utils'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { relatedSettingsKeys, relationshipKey, useSetting, useSettings } from '../page_template/settings'
import { debugPerformance } from '../search'
import { TestUtils } from '../utils/TestUtils'
import { randomColor } from '../utils/color'
import { computeAspectRatio } from '../utils/coordinates'
import { assert } from '../utils/defensive'
import { isHistoricalCD } from '../utils/is_historical'
import { Feature, IRelatedButton, IRelatedButtons } from '../utils/protos'
import { loadShapeFromPossibleSymlink } from '../utils/symlinks'
import { NormalizeProto } from '../utils/types'

import { mapBorderRadius, mapBorderWidth, useScreenshotMode, screencapElement } from './screenshot'
import { renderMap } from './screenshot-map'

export const defaultMapPadding = 20

export interface Inset { bottomLeft: [number, number], topRight: [number, number], coordBox?: [number, number, number, number], mainMap: boolean, name?: string }
export type Insets = Inset[]
export type MapHeight =
    | { type: 'fixed-height', value: number | string }
    | { type: 'aspect-ratio', value: number }

export interface MapGenericProps {
    height?: MapHeight
    basemap: Basemap
    attribution: 'none' | 'startHidden' | 'startVisible'
    insets?: Insets
}

export interface Polygon {
    name: string
    style: PolygonStyle
    meta: Record<string, unknown>
    notClickable?: boolean
}
export interface Polygons {
    polygons: Polygon[]
    zoomIndex: number
}

export interface MapState {
    loading: boolean
    mapIsVisible: boolean[]
    polygonByName: Map<string, GeoJSON.Feature>
}

interface PolygonStyle {
    fillColor: string
    fillOpacity: number
    color: string
    weight?: number
}

const activeMaps: MapGeneric<MapGenericProps>[] = []

class CustomAttributionControl extends maplibregl.AttributionControl {
    constructor(startShowingAttribution: boolean) {
        super()

        // Copied from implementation https://github.com/maplibre/maplibre-gl-js/blob/34b95c06259014661cf72a418fd81917313088bf/src/ui/control/attribution_control.ts#L190
        // But reduced since always compact
        this._updateCompact = () => {
            if (!this._container.classList.contains('maplibregl-compact') && !this._container.classList.contains('maplibregl-attrib-empty')) {
                this._container.classList.add('maplibregl-compact')
                if (startShowingAttribution) {
                    this._container.setAttribute('open', '')
                    this._container.classList.add('maplibregl-compact-show')
                }
            }
        }
    }
}

class MapHandler {
    public ids: string[]
    public mainMaps: boolean[] = []
    public maps: maplibregl.Map[] | undefined = undefined
    private ensureStyleLoaded: Promise<void> | undefined = undefined

    constructor(mainMaps: boolean[]) {
        this.ids = Array.from({ length: mainMaps.length }, (_, i) => `map-${i}-${Math.random().toString(36).substring(2)}`)
        this.mainMaps = mainMaps
    }

    initialize(onClick: (name: string) => void): void {
        [this.maps, this.ensureStyleLoaded] = createMaps(this.ids, this.mainMaps, onClick)
    }

    container(): HTMLElement {
        assert(this.maps !== undefined, 'Map must be initialized before accessing container')
        return this.maps[0].getContainer()
    }

    async getMaps(): Promise<maplibregl.Map[]> {
        while (this.maps === undefined) {
            await new Promise(resolve => setTimeout(resolve, 10))
        }
        return this.maps
    }

    async ensureStyleLoadedFn(): Promise<maplibregl.Map[]> {
        while (this.ensureStyleLoaded === undefined) {
            await new Promise(resolve => setTimeout(resolve, 10))
        }
        await this.ensureStyleLoaded
        return await this.getMaps()
    }

    async stylesheetPresent(): Promise<maplibregl.Map[]> {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- it can in fact be undefined, this is undocumented
        if (this.maps?.every(map => map.style.stylesheet !== undefined)) {
            return this.maps
        }
        await new Promise(resolve => setTimeout(resolve, 10))
        return await this.stylesheetPresent()
    }
}

function createMap(
    id: string,
    onClick: (name: string) => void,
    fullMap: boolean,
): [maplibregl.Map, Promise<void>] {
    const map = new maplibregl.Map({
        style: 'https://tiles.openfreemap.org/styles/bright',
        container: id,
        scrollZoom: fullMap,
        dragPan: fullMap,
        dragRotate: false,
        canvasContextAttributes: {
            preserveDrawingBuffer: true,
        },
        pixelRatio: TestUtils.shared.isTesting ? 0.1 : undefined, // e2e tests often run with a software renderer, this saves time
        attributionControl: false,
    })

    if (fullMap) {
        map.addControl(new maplibregl.FullscreenControl(), 'top-left')
        map.on('mouseover', 'polygon', () => {
            map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', 'polygon', () => {
            map.getCanvas().style.cursor = ''
        })
        map.on('click', 'polygon', (e) => {
            const features = e.features!
            const names = features.filter(feature => !feature.properties.notClickable).map(feature => feature.properties.name as string)
            if (names.length === 0) {
                return
            }
            onClick(names[0])
        })
    }

    const ensureStyleLoaded = new Promise(resolve => map.on('style.load', resolve)) satisfies Promise<void>
    return [map, ensureStyleLoaded]
}

function createMaps(
    ids: string[],
    mainMaps: boolean[],
    onClick: (name: string) => void,
): [maplibregl.Map[], Promise<void>] {
    const maps = []
    const ensureStyleLoadeds = []
    for (const [i, id] of ids.entries()) {
        const [map, ensureStyleLoaded] = createMap(id, onClick, mainMaps[i])
        maps.push(map)
        ensureStyleLoadeds.push(ensureStyleLoaded)
    }
    const ensureStyleLoaded = Promise.all(ensureStyleLoadeds).then(() => undefined) satisfies Promise<void>
    return [maps, ensureStyleLoaded]
}

// eslint-disable-next-line prefer-function-component/prefer-function-component  -- TODO: Maps don't support function components yet.
export class MapGeneric<P extends MapGenericProps> extends React.Component<P, MapState> {
    private delta = 0.25
    private version = 0
    private last_modified = 0
    private basemap_props: null | Basemap = null
    private exist_this_time: string[] = []
    private attributionControl: CustomAttributionControl | undefined
    protected handler: MapHandler
    private hasZoomed = false

    constructor(props: P) {
        super(props)
        this.state = { loading: true, polygonByName: new Map(), mapIsVisible: this.insets().map(() => true) }
        activeMaps.push(this)
        this.handler = new MapHandler(this.insets().map(inset => inset.mainMap))
    }

    insets(): Insets {
        return this.props.insets ?? [{ bottomLeft: [0, 0], topRight: [1, 1], mainMap: true }]
    }

    override render(): ReactNode {
        return (
            <>
                <input type="hidden" data-test-loading={this.state.loading} />
                <div style={{ position: 'relative', ...this.mapStyle() }}>
                    {this.insets().map((bbox, i) => (
                        <MapBody
                            key={this.handler.ids[i]}
                            id={this.handler.ids[i]}
                            height="100%"
                            buttons={this.buttons()}
                            bbox={bbox}
                            insetBoundary={i > 0}
                            visible={this.state.mapIsVisible[i]}
                        />
                    ))}
                </div>
                <div style={{ display: 'none' }}>
                    {Array.from(this.state.polygonByName.keys()).map(name =>
                        // eslint-disable-next-line react/no-unknown-property -- this is a custom property
                        <div key={name} clickable-polygon={name} onClick={() => { this.onClick(name) }} />,
                    )}
                </div>
            </>
        )
    }

    mapHeight(): number | string {
        const height = this.props.height ?? { type: 'fixed-height', value: 400 }
        if (height.type === 'aspect-ratio') {
            return '100%'
        }
        return height.value
    }

    mapStyle(): React.CSSProperties {
        const height = this.props.height ?? { type: 'fixed-height', value: 400 }
        if (height.type === 'aspect-ratio') {
            return {
                aspectRatio: height.value.toString(),
                width: '100%',
                minHeight: '300px',
            }
        }
        return {
            height: height.value,
            width: '100%',
        }
    }

    buttons(): ReactNode {
        return <></>
    }

    computePolygons(): Promise<Polygons> {
        /**
         * Should return [names, styles, metas, zoom_index]
         * names: list of names of polygons to draw
         * styles: list of styles for each polygon
         * metas: list of metadata dictionaries for each polygon
         * zoom_index: index of polygon to zoom to, or -1 if none
         */
        throw new Error('compute_polygons not implemented')
    }

    async mapDidRender(): Promise<void> {
        /**
             * Called after the map is rendered
             */
    }

    async loadShape(name: string): Promise<NormalizeProto<Feature>> {
        return await loadShapeFromPossibleSymlink(name) as NormalizeProto<Feature>
    }

    subnationalOutlines(): maplibregl.LayerSpecification[] {
        const basemap = this.props.basemap
        if (basemap.type !== 'osm' || !basemap.subnationalOutlines) {
            return []
        }
        return [
            {
                'id': 'boundary_subn_overlayed',
                'type': 'line',
                'source': 'openmaptiles',
                'source-layer': 'boundary',
                'filter': [
                    'all',
                    [
                        '<=',
                        [
                            'get',
                            'admin_level',
                        ],
                        4,
                    ],
                    [
                        '!=',
                        [
                            'get',
                            'maritime',
                        ],
                        1,
                    ],
                    [
                        '!=',
                        [
                            'get',
                            'disputed',
                        ],
                        1,
                    ],
                    [
                        '!',
                        [
                            'has',
                            'claimed_by',
                        ],
                    ],
                ],
                'paint': {
                    'line-color': basemap.subnationalOutlines.color,
                    'line-width': basemap.subnationalOutlines.weight,
                },
            },
        ]
    }

    override async componentDidMount(): Promise<void> {
        this.handler.initialize((name) => { this.onClick(name) })
        const maps = await this.handler.getMaps()
        const insets = this.insets()
        assert(maps.length === insets.length, `Expected ${insets.length} maps, got ${maps.length}`)
        for (const i of insets.keys()) {
            const map = maps[i]
            const { coordBox } = insets[i]
            if (coordBox) {
                const bounds = new maplibregl.LngLatBounds(
                    new maplibregl.LngLat(coordBox[0], coordBox[1]),
                    new maplibregl.LngLat(coordBox[2], coordBox[3]),
                )
                map.fitBounds(bounds, { animate: false })
            }
        }
        this.hasZoomed = true
        await this.componentDidUpdate(this.props, this.state)
    }

    onClick(name: string): void {
        void this.context.navigate({
            kind: 'article',
            universe: this.context.universe,
            longname: name,
        }, { history: 'push', scroll: { kind: 'element', element: this.handler.container() } })
    }

    async exportAsPng(colorbarElement: HTMLElement | undefined, backgroundColor: string, insetBorderColor: string): Promise<string> {
        const pixelRatio = 4
        const width = 4096
        const colorbarHeight = 300
        const cBarPad = 40

        const maps = await this.handler.getMaps()
        const insets = this.insets()

        const mainMap = maps[0]
        const mapBounds = mainMap.getBounds()

        const aspectRatio = computeAspectRatio([
            mapBounds.getWest(),
            mapBounds.getSouth(),
            mapBounds.getEast(),
            mapBounds.getNorth(),
        ])

        const height = Math.round(width / aspectRatio)

        const totalHeight = height + colorbarHeight

        const params = { width, height, pixelRatio, insetBorderColor }

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = width
        canvas.height = totalHeight

        await Promise.all(maps.map(async (map, i) => {
            if (!this.state.mapIsVisible[i]) {
                return
            }
            const inset = insets[i]
            await renderMap(ctx, map, inset, params)
        }))

        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, height, width, colorbarHeight) // Fill the entire colorbar area

        if (colorbarElement) {
            const colorbarWidth = (colorbarHeight - cBarPad) * colorbarElement.offsetWidth / colorbarElement.offsetHeight

            const colorbarCanvas = await screencapElement(colorbarElement, colorbarWidth, 1)

            ctx.drawImage(colorbarCanvas, (width - colorbarWidth) / 2, height + cBarPad / 2)
        }

        return canvas.toDataURL('image/png', 1.0)
    }

    async exportAsGeoJSON(): Promise<string> {
        const { polygons } = await this.computePolygons()
        const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: [],
        }
        for (const polygon of polygons) {
            let feature = await this.polygonGeojson(polygon.name, polygon.notClickable, polygon.style)
            feature = JSON.parse(JSON.stringify(feature)) as typeof feature
            for (const [key, value] of Object.entries(polygon.meta)) {
                feature.properties![key] = value
            }
            geojson.features.push(feature)
        }
        return JSON.stringify(geojson)
    }

    override async componentDidUpdate(prevProps: P, prevState: MapState): Promise<void> {
        let shouldWeUpdate = false
        // make sure we update the first time
        shouldWeUpdate ||= this.version < 1
        shouldWeUpdate ||= JSON.stringify(prevProps) !== JSON.stringify(this.props)
        shouldWeUpdate ||= JSON.stringify({ ...prevState, loading: undefined }) !== JSON.stringify({ ...this.state, loading: undefined })
        if (shouldWeUpdate) {
            // Only update if something that's not the loading has changed, or it's the first load
            await this.bumpVersion()
        }
    }

    async bumpVersion(): Promise<void> {
        return this.updateToVersion(this.version + 1)
    }

    async updateToVersion(version: number): Promise<void> {
        if (version <= this.version) {
            return
        }
        // check if at least 1s has passed since last update
        const now = Date.now()
        const delta = now - this.last_modified
        await this.handler.getMaps()
        if (delta < 1000) {
            setTimeout(() => this.updateToVersion(version), 1000 - delta)
            return
        }
        this.version = version
        this.last_modified = now
        await this.updateFn()
    }

    async updateFn(): Promise<void> {
        const time = Date.now()
        debugPerformance('Loading map...')
        this.setState({ loading: true })
        const maps = await this.handler.getMaps()

        if (this.attributionControl !== undefined) {
            maps[0].removeControl(this.attributionControl)
            this.attributionControl = undefined
        }

        if (this.props.attribution !== 'none') {
            this.attributionControl = new CustomAttributionControl(this.props.attribution === 'startVisible')
            maps[0].addControl(this.attributionControl)
        }

        this.exist_this_time = []

        this.attachBasemap()

        await this.populateMap(maps, time)
        this.setState({ loading: false })
        debugPerformance(`Updated sources to delete stuff; at ${Date.now() - time}ms`)
        debugPerformance(`No longer loading map; took ${Date.now() - time}ms`)
    }

    async populateMap(maps: maplibregl.Map[], timeBasis: number): Promise<void> {
        const { polygons, zoomIndex } = await this.computePolygons()

        debugPerformance(`Computed polygons; at ${Date.now() - timeBasis}ms`)

        await this.addPolygons(polygons, zoomIndex)

        debugPerformance(`Added polygons; at ${Date.now() - timeBasis}ms`)

        // Remove polygons that no longer exist
        // Must do this before map render or zooms are incorrect (they try to zoom to previous regions)
        for (const [name] of this.state.polygonByName.entries()) {
            if (!this.exist_this_time.includes(name)) {
                this.state.polygonByName.delete(name)
            }
        }

        debugPerformance(`Removed polygons; at ${Date.now() - timeBasis}ms`)

        await this.mapDidRender()

        debugPerformance(`Finished waiting for mapDidRender; at ${Date.now() - timeBasis}ms`)

        await this.updateSources(true)
    }

    attachBasemap(): void {
        if (JSON.stringify(this.props.basemap) === JSON.stringify(this.basemap_props)) {
            return
        }
        this.basemap_props = this.props.basemap
        void this.loadBasemap()
    }

    async loadBasemap(): Promise<void> {
        const maps = await this.handler.stylesheetPresent()
        // await this.ensureStyleLoaded()
        maps.forEach((map) => { setBasemap(map, this.props.basemap) })
    }

    progressivelyLoadPolygons(): boolean {
        // Whether to attempt to refresh the map as polygons are added
        return true
    }

    async addPolygons(polygons: Polygon[], zoom_to: number): Promise<void> {
        const time = Date.now()
        debugPerformance('Adding polygons...')
        await Promise.all(polygons.map(async (polygon, i) => {
            await this.addPolygon(polygon, i === zoom_to)
            if (this.progressivelyLoadPolygons()) {
                await this.updateSources()
            }
        }))
        debugPerformance(`Added polygons [addPolygons]; at ${Date.now() - time}ms`)
        await this.updateSources(true)
        debugPerformance(`Updated sources [addPolygons]; at ${Date.now() - time}ms`)
    }

    async polygonGeojson(name: string, notClickable: boolean | undefined, style: PolygonStyle): Promise<GeoJSON.Feature> {
        const poly = await this.loadShape(name)
        const geojson = {
            type: 'Feature' as const,
            properties: { name, notClickable, ...style },
            geometry: geometry(poly),
        }
        return geojson
    }

    sources_last_updated = 0

    firstLabelId(map: maplibregl.Map): string | undefined {
        for (const layer of map.style.stylesheet.layers) {
            if (layer.type === 'symbol' && layer.id.startsWith('label')) {
                return layer.id
            }
        }
        return undefined
    }

    async updateSources(force = false): Promise<void> {
        if (this.sources_last_updated > Date.now() - 1000 && !force) {
            return
        }
        const maps = await this.handler.getMaps()
        if (maps.some(map => !map.isStyleLoaded()) && !force) {
            return
        }
        this.sources_last_updated = Date.now()
        await this.handler.ensureStyleLoadedFn()
        const polys = Array.from(this.state.polygonByName.values())
        const mapIsVisible = maps.map((map, i) => this.setUpMap(map, polys, this.insets()[i]))
        this.setState({ mapIsVisible })
    }

    setUpMap(map: maplibregl.Map, polys: GeoJSON.Feature[], inset: Inset): boolean {
        const bbox = inset.coordBox
        if (!inset.mainMap && bbox !== undefined) {
            polys = polys.filter((poly) => {
                const bounds = boundingBox(poly.geometry)
                // Check if the polygon overlaps the inset bounds
                return bounds.getWest() < bbox[2] && bounds.getEast() > bbox[0]
                    && bounds.getNorth() > bbox[1] && bounds.getSouth() < bbox[3]
            })
        }
        const data = {
            type: 'FeatureCollection',
            features: polys,
        } satisfies GeoJSON.FeatureCollection
        let source: maplibregl.GeoJSONSource | undefined = map.getSource('polygon')
        const labelId = this.firstLabelId(map)
        if (source === undefined) {
            map.addSource('polygon', {
                type: 'geojson',
                data,
            })
            map.addLayer({
                id: 'polygon',
                type: 'fill',
                source: 'polygon',
                paint: {
                    'fill-color': ['get', 'fillColor'],
                    'fill-opacity': ['get', 'fillOpacity'],
                },
            }, labelId)
            map.addLayer({
                id: 'polygon-outline',
                type: 'line',
                source: 'polygon',
                paint: {
                    'line-color': ['get', 'color'],
                    'line-width': ['get', 'weight'],
                },
            }, labelId)
            source = map.getSource('polygon')!
        }
        for (const layer of this.subnationalOutlines()) {
            if (map.getLayer(layer.id) !== undefined) {
                map.removeLayer(layer.id)
            }
            map.addLayer(layer, labelId)
        }
        source.setData(data)
        return polys.length > 0 || inset.mainMap
    }

    /*
     * Returns whether or not we actually need to update the sources
     */
    async addPolygon(polygon: Polygon, fit_bounds: boolean): Promise<void> {
        this.exist_this_time.push(polygon.name)
        if (this.state.polygonByName.has(polygon.name)) {
            this.state.polygonByName.get(polygon.name)!.properties = { ...polygon.style, name: polygon.name, notClickable: polygon.notClickable }
        }
        const geojson = await this.polygonGeojson(polygon.name, polygon.notClickable, polygon.style)
        if (fit_bounds) {
            this.zoomToItems([geojson], { animate: false })
        }

        this.state.polygonByName.set(polygon.name, geojson)
    }

    zoomToItems(items: Iterable<GeoJSON.Feature>, options: maplibregl.FitBoundsOptions): void {
        this.handler.maps?.forEach((map) => {
            map.fitBounds(
                extendBoxes(Array.from(items).map(feature => boundingBox(feature.geometry))),
                { padding: defaultMapPadding, ...options },
            )
        })
    }

    zoomToAll(options: maplibregl.FitBoundsOptions = {}): void {
        this.zoomToItems(this.state.polygonByName.values(), options)
    }

    zoomTo(name: string): void {
        this.zoomToItems([this.state.polygonByName.get(name)!], {})
    }

    static override contextType = Navigator.Context

    declare context: React.ContextType<typeof Navigator.Context>
}

function MapBody(props: { id: string, height: number | string, buttons: ReactNode, bbox: Inset, insetBoundary: boolean, visible: boolean }): ReactNode {
    const colors = useColors()
    const isScreenshot = useScreenshotMode()
    // Optionally use props.bbox.bottomLeft and props.bbox.topRight for custom placement
    const [x0, y0] = props.bbox.bottomLeft
    const [x1, y1] = props.bbox.topRight
    return (
        <div
            id={props.id}
            style={{
                left: `${x0 * 100}%`,
                bottom: `${y0 * 100}%`,
                width: `${(x1 - x0) * 100}%`,
                height: `${(y1 - y0) * 100}%`,
                position: 'absolute',
                border: props.insetBoundary ? `2px solid ${colors.mapInsetBorderColor}` : `${mapBorderWidth}px solid ${colors.borderNonShadow}`,
                borderRadius: props.insetBoundary ? '0px' : `${mapBorderRadius}px`,
                // In screenshot mode, the background is transparent so we can render this component atop the already-rendered map canvases
                // In normal mode, the map is drawn over this normally, but is hidden during e2e testing, where we use the background color to mark map position
                backgroundColor: isScreenshot ? 'transparent' : colors.slightlyDifferentBackground,
                ...(props.visible ? {} : { display: 'none' }),
            }}
        >
            {/* place this on the right of the map */}
            <div style={
                { zIndex: 1000, position: 'absolute', right: 0, top: 0, padding: '1em' }
            }
            >
                {props.buttons}
            </div>
        </div>
    )
}

function isVisible(basemap: Basemap, layer: maplibregl.LayerSpecification): boolean {
    switch (basemap.type) {
        case 'none':
            return false
        case 'osm':
            if (basemap.noLabels && layer.type === 'symbol') {
                return false
            }
            return true
    }
}

function setBasemap(map: maplibregl.Map, basemap: Basemap): void {
    map.style.stylesheet.layers.forEach((layerspec: maplibregl.LayerSpecification) => {
        if (layerspec.id === 'background') {
            return
        }
        const layer = map.getLayer(layerspec.id)!
        layer.setLayoutProperty('visibility', isVisible(basemap, layerspec) ? 'visible' : 'none')
    })
}

function clickMapElement(longname: string): void {
    for (const map of activeMaps) {
        if (map.state.polygonByName.has(longname)) {
            map.onClick(longname)
            return
        }
    }
    throw new Error(`Polygon ${longname} not found in any map`)
}

// for testing
(window as unknown as {
    clickMapElement: (longname: string) => void
}).clickMapElement = clickMapElement

interface MapProps extends MapGenericProps {
    longname: string
    related: NormalizeProto<IRelatedButtons>[]
    articleType: string
}

interface ArticleMapProps extends MapProps {
    showHistoricalCDs: boolean
    settings: Record<string, unknown>
    color: string
}

// eslint-disable-next-line no-restricted-syntax -- Don't want to overwrite the JS Map
export { MapComponent as Map }
function MapComponent(props: MapProps): ReactNode {
    const colors = useColors()
    const [showHistoricalCDs] = useSetting('show_historical_cds')
    const relatedCheckboxSettings = useSettings(relatedSettingsKeys(props.articleType))
    return (
        <ArticleMap
            {...props}
            showHistoricalCDs={showHistoricalCDs}
            settings={relatedCheckboxSettings}
            color={colors.hueColors.blue}
        />
    )
}

class ArticleMap extends MapGeneric<ArticleMapProps> {
    private already_fit_bounds: string | undefined = undefined

    override computePolygons(): Promise<Polygons> {
        const relateds = [
            ...this.getRelated('contained_by'),
            ...this.getRelated('intersects'),
            ...this.getRelated('borders'),
            ...this.getRelated('contains'),
            ...this.getRelated('same_geography'),
        ]

        const relatedPolygons = this.relatedPolygons(relateds)

        return Promise.resolve({
            polygons: [
                {
                    name: this.props.longname,
                    style: { fillOpacity: 0.5, weight: 1, color: this.props.color, fillColor: this.props.color },
                    meta: {},
                    notClickable: true,
                },
                ...relatedPolygons,
            ],
            zoomIndex: this.already_fit_bounds !== this.props.longname ? 0 : -1,
        })
    }

    override mapDidRender(): Promise<void> {
        this.already_fit_bounds = this.props.longname
        return Promise.resolve()
    }

    getRelated(key: string): NormalizeProto<IRelatedButton>[] {
        const element = this.props.related.filter(
            x => x.relationshipType === key)
            .map(x => x.buttons)[0]
        return element
    }

    relatedPolygons(related: NormalizeProto<IRelatedButton>[]): Polygon[] {
        const result: Polygon[] = []
        for (let i = related.length - 1; i >= 0; i--) {
            if (!this.props.showHistoricalCDs && isHistoricalCD(related[i].rowType)) {
                continue
            }
            const key = relationshipKey(this.props.articleType, related[i].rowType)
            if (!this.props.settings[key]) {
                continue
            }

            const color = randomColor(related[i].longname)
            const style = { color, weight: 1, fillColor: color, fillOpacity: 0.1 }
            result.push({
                name: related[i].longname,
                style,
                meta: {},
            })
        }
        return result
    }
}
