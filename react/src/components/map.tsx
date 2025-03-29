import geojsonExtent from '@mapbox/geojson-extent'
import { GeoJSON2SVG } from 'geojson2svg'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import React, { ReactNode } from 'react'

import { Basemap } from '../mapper/settings'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { relatedSettingsKeys, relationshipKey, useSetting, useSettings } from '../page_template/settings'
import { debugPerformance } from '../search'
import { randomColor } from '../utils/color'
import { isHistoricalCD } from '../utils/is_historical'
import { Feature, IRelatedButton, IRelatedButtons } from '../utils/protos'
import { loadShapeFromPossibleSymlink } from '../utils/symlinks'
import { NormalizeProto } from '../utils/types'

export interface MapGenericProps {
    height?: string
    basemap: Basemap
}

export interface Polygon {
    name: string
    style: PolygonStyle
    meta: Record<string, unknown>
}
export interface Polygons {
    polygons: Polygon[]
    zoomIndex: number
}

interface MapState {
    loading: boolean
    polygonByName: Map<string, GeoJSON.Feature>
}

interface PolygonStyle {
    fillColor: string
    fillOpacity: number
    color: string
    weight?: number
}

const activeMaps: MapGeneric<MapGenericProps>[] = []

// eslint-disable-next-line prefer-function-component/prefer-function-component  -- TODO: Maps don't support function components yet.
export class MapGeneric<P extends MapGenericProps> extends React.Component<P, MapState> {
    private delta = 0.25
    private version = 0
    private last_modified = 0
    private basemap_props: null | Basemap = null
    protected map: maplibregl.Map | undefined = undefined
    private exist_this_time: string[] = []
    private id: string
    private ensureStyleLoaded: Promise<void> | undefined = undefined

    constructor(props: P) {
        super(props)
        this.id = `map-${Math.random().toString(36).substring(2)}`
        this.state = { loading: true, polygonByName: new Map() }
        activeMaps.push(this)
    }

    override render(): ReactNode {
        return (
            <>
                <input type="hidden" data-test-loading={this.state.loading} />
                <MapBody id={this.id} height={this.props.height} buttons={this.buttons()} />
                <div style={{ display: 'none' }}>
                    {Array.from(this.state.polygonByName.keys()).map(name =>
                        // eslint-disable-next-line react/no-unknown-property -- this is a custom property
                        <div key={name} clickable-polygon={name} onClick={() => { this.onClick(name) }} />,
                    )}
                </div>
            </>
        )
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

    override async componentDidMount(): Promise<void> {
        const map = new maplibregl.Map({
            style: 'https://tiles.openfreemap.org/styles/bright',
            container: this.id,
            scrollZoom: true,
            attributionControl: false,
            dragRotate: false,
        })
        this.map = map
        this.ensureStyleLoaded = new Promise(resolve => map.on('style.load', resolve))
        map.on('mouseover', 'polygon', () => {
            map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', 'polygon', () => {
            map.getCanvas().style.cursor = ''
        })
        map.on('click', 'polygon', (e) => {
            const features = e.features!
            const names = features.map(feature => feature.properties.name as string)
            this.onClick(names[0])
        })
        await this.componentDidUpdate(this.props, this.state)
    }

    onClick(name: string): void {
        void this.context.navigate({
            kind: 'article',
            universe: this.context.universe,
            longname: name,
        }, { history: 'push', scroll: { kind: 'element', element: this.map!.getContainer() } })
    }

    /**
     * Export the map as an svg, without the background
     *
     * @returns string svg
     */
    async exportAsSvg(): Promise<string> {
        const { polygons } = await this.computePolygons()
        const mapBounds = this.map!.getBounds()
        const bounds = {
            left: mapBounds.getWest(),
            right: mapBounds.getEast(),
            top: mapBounds.getNorth(),
            bottom: mapBounds.getSouth(),
        }
        const width = 1000
        const height = width * (bounds.top - bounds.bottom) / (bounds.right - bounds.left)
        const converter = new GeoJSON2SVG({
            mapExtent: bounds, attributes: [{
                property: 'style',
                type: 'dynamic',
                key: 'style',
            }],
            viewportSize: {
                width,
                height,
            },
        })

        function toSvgStyle(style: PolygonStyle): string {
            let svgStyle = ''
            svgStyle += `fill:${style.fillColor};`
            svgStyle += `fill-opacity:${style.fillOpacity};`
            svgStyle += `stroke:${style.color};`
            if (style.weight !== undefined) {
                svgStyle += `stroke-width:${style.weight / 10};`
            }
            return svgStyle
        }

        const overallSvg = []

        for (const polygon of polygons) {
            const geojson = await this.polygonGeojson(polygon.name, polygon.style)
            const svg = converter.convert(geojson, { attributes: { style: toSvgStyle(polygon.style) } })
            for (const elem of svg) {
                overallSvg.push(elem)
            }
        }
        const header = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
         <!-- Created with urban stats mapper (http://www.urbanstats.org/) -->
            <svg
            width="${width}mm"
            height="${height}mm"
            viewBox="0 0 ${width} ${height}"
            version="1.1"
            id="svg1"
            xml:space="preserve"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:svg="http://www.w3.org/2000/svg">`
        const footer = '</svg>'
        return header + overallSvg.join('') + footer
    }

    async exportAsGeoJSON(): Promise<string> {
        const { polygons } = await this.computePolygons()
        const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: [],
        }
        for (const polygon of polygons) {
            let feature = await this.polygonGeojson(polygon.name, polygon.style)
            feature = JSON.parse(JSON.stringify(feature)) as typeof feature
            for (const [key, value] of Object.entries(polygon.meta)) {
                feature.properties![key] = value
            }
            geojson.features.push(feature)
        }
        return JSON.stringify(geojson)
    }

    override async componentDidUpdate(prevProps: P, prevState: MapState): Promise<void> {
        if (this.version === 0 || JSON.stringify(prevProps) !== JSON.stringify(this.props) || JSON.stringify({ ...prevState, loading: undefined }) !== JSON.stringify({ ...this.state, loading: undefined })) {
            // Only update if something that's not the loading has changed, or it's the first load
            await this.updateToVersion(this.version + 1)
        }
    }

    async updateToVersion(version: number): Promise<void> {
        if (version <= this.version) {
            return
        }
        // check if at least 1s has passed since last update
        const now = Date.now()
        const delta = now - this.last_modified
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

        const map = this.map!
        this.exist_this_time = []

        this.attachBasemap()

        const { polygons, zoomIndex } = await this.computePolygons()

        debugPerformance(`Computed polygons; at ${Date.now() - time}ms`)

        await this.addPolygons(map, polygons, zoomIndex)

        debugPerformance(`Added polygons; at ${Date.now() - time}ms`)
        await this.mapDidRender()
        debugPerformance(`Finished waiting for mapDidRender; at ${Date.now() - time}ms`)

        // Remove polygons that no longer exist
        for (const [name] of this.state.polygonByName.entries()) {
            if (!this.exist_this_time.includes(name)) {
                this.state.polygonByName.delete(name)
            }
        }
        await this.updateSources(true)
        debugPerformance(`Updated sources to delete stuff; at ${Date.now() - time}ms`)
        debugPerformance(`No longer loading map; took ${Date.now() - time}ms`)
        this.setState({ loading: false })
    }

    attachBasemap(): void {
        if (JSON.stringify(this.props.basemap) === JSON.stringify(this.basemap_props)) {
            return
        }
        this.basemap_props = this.props.basemap
        void this.loadBasemap()
    }

    async stylesheetPresent(): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- it can in fact be undefined, this is undocumented
        if (this.map!.style.stylesheet !== undefined) {
            return
        }
        await new Promise(resolve => setTimeout(resolve, 10))
        await this.stylesheetPresent()
    }

    async loadBasemap(): Promise<void> {
        await this.stylesheetPresent()
        // await this.ensureStyleLoaded()
        setBasemap(this.map!, this.props.basemap)
    }

    async addPolygons(map: maplibregl.Map, polygons: Polygon[], zoom_to: number): Promise<void> {
        /*
         * We want to parallelize polygon loading, but we also need to add the polygons in a deterministic order for testing purposes (as well as to show contained polygons atop their parent)
         * So, we start all the loads asynchronously, but actually add the polygons to the map only as they finish loading in order
         * Waiting for all the polygons to load before adding them produces an unacceptable delay
         */
        const time = Date.now()
        debugPerformance('Adding polygons...')
        let adderIndex = 0
        const adders = new Map<number, () => Promise<void>>()
        const addDone = async (): Promise<void> => {
            while (adders.has(adderIndex)) {
                await adders.get(adderIndex)!()
                adders.delete(adderIndex)
                adderIndex++
            }
        }
        await Promise.all(polygons.map(async (polygon, i) => {
            const adder = await this.addPolygon(map, polygon, i === zoom_to)
            adders.set(i, adder)
            await addDone()
        }))
        debugPerformance(`Added polygons [addPolygons]; at ${Date.now() - time}ms`)
        await this.updateSources(true)
        debugPerformance(`Updated sources [addPolygons]; at ${Date.now() - time}ms`)
    }

    async polygonGeojson(name: string, style: PolygonStyle): Promise<GeoJSON.Feature> {
        // https://stackoverflow.com/a/35970894/1549476
        const poly = await this.loadShape(name)
        let geometry: GeoJSON.Geometry
        if (poly.geometry === 'multipolygon') {
            const polys = poly.multipolygon.polygons
            const coords = polys.map(
                multiPoly => multiPoly.rings.map(
                    ring => ring.coords.map(
                        coordinate => [coordinate.lon, coordinate.lat],
                    ),
                ),
            )
            geometry = {
                type: 'MultiPolygon',
                coordinates: coords,
            }
        }
        else {
            const coords = poly.polygon.rings.map(
                ring => ring.coords.map(
                    coordinate => [coordinate.lon, coordinate.lat],
                ),
            )
            geometry = {
                type: 'Polygon',
                coordinates: coords,
            }
        }
        const geojson = {
            type: 'Feature' as const,
            properties: { name, ...style },
            geometry,
        }
        return geojson
    }

    sources_last_updated = 0

    async updateSources(force = false): Promise<void> {
        if (this.sources_last_updated > Date.now() - 1000 && !force) {
            return
        }
        const time = Date.now()
        if (!this.map!.isStyleLoaded() && !force) {
            return
        }
        console.log('updating sources. last updated: ', this.sources_last_updated, ' now: ', Date.now())
        this.sources_last_updated = Date.now()
        await this.ensureStyleLoaded!
        debugPerformance(`Loaded style, took ${Date.now() - time}ms`)
        const map = this.map!
        const data = {
            type: 'FeatureCollection',
            features: Array.from(this.state.polygonByName.values()),
        } satisfies GeoJSON.FeatureCollection
        let source: maplibregl.GeoJSONSource | undefined = map.getSource('polygon')
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
            })
            map.addLayer({
                id: 'polygon-outline',
                type: 'line',
                source: 'polygon',
                paint: {
                    'line-color': ['get', 'color'],
                    'line-width': ['get', 'weight'],
                },
            })
            source = map.getSource('polygon')!
        }
        source.setData(data)
    }

    /*
     * Returns a function that adds the polygon.
     * The reason for this is so that we can add the polygons in a specific order independent of the order in which they end up loading
     */
    async addPolygon(map: maplibregl.Map, polygon: Polygon, fit_bounds: boolean): Promise<() => Promise<void>> {
        this.exist_this_time.push(polygon.name)
        if (this.state.polygonByName.has(polygon.name)) {
            this.state.polygonByName.get(polygon.name)!.properties = { ...polygon.style, name: polygon.name }
            return () => Promise.resolve()
        }
        const geojson = await this.polygonGeojson(polygon.name, polygon.style)
        if (fit_bounds) {
            this.zoomToItems([geojson], { duration: 0 })
        }

        this.state.polygonByName.set(polygon.name, geojson)
        return async () => {
            await this.updateSources()
        }
    }

    zoomToItems(items: Iterable<GeoJSON.Feature>, options: maplibregl.AnimationOptions): void {
        // zoom such that all items are visible
        const bounds = new maplibregl.LngLatBounds()

        for (const polygon of items) {
            const bbox = geojsonExtent(polygon)
            bounds.extend(new maplibregl.LngLatBounds(
                new maplibregl.LngLat(bbox[0], bbox[1]),
                new maplibregl.LngLat(bbox[2], bbox[3]),
            ))
        }
        this.map?.fitBounds(bounds, options)
    }

    zoomToAll(): void {
        this.zoomToItems(this.state.polygonByName.values(), {})
    }

    zoomTo(name: string): void {
        this.zoomToItems([this.state.polygonByName.get(name)!], {})
    }

    static override contextType = Navigator.Context

    declare context: React.ContextType<typeof Navigator.Context>
}

function MapBody(props: { id: string, height: string | undefined, buttons: ReactNode }): ReactNode {
    const colors = useColors()
    return (
        <div className="map-container-for-testing">
            <div
                id={props.id}
                style={{
                    background: colors.background,
                    height: props.height ?? 400,
                    width: '100%',
                    position: 'relative',
                    border: `1px solid ${colors.borderNonShadow}`,
                    borderRadius: '5px',
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
        </div>
    )
}

function setBasemap(map: maplibregl.Map, basemap: Basemap): void {
    map.style.stylesheet.layers.forEach((layerspec: maplibregl.LayerSpecification) => {
        if (layerspec.id === 'background') {
            return
        }
        const layer = map.getLayer(layerspec.id)!
        if (basemap.type === 'none') {
            layer.setLayoutProperty('visibility', 'none')
        }
        else {
            layer.setLayoutProperty('visibility', 'visible')
        }
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
