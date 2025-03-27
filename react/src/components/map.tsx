import geojsonExtent from '@mapbox/geojson-extent'
import { GeoJSON2SVG } from 'geojson2svg'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import React, { ReactNode } from 'react'

import { Basemap } from '../mapper/settings'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { relatedSettingsKeys, relationshipKey, useSetting, useSettings } from '../page_template/settings'
import { randomColor } from '../utils/color'
import { isHistoricalCD } from '../utils/is_historical'
import { Feature, IRelatedButton, IRelatedButtons } from '../utils/protos'
import { loadShapeFromPossibleSymlink } from '../utils/symlinks'
import { NormalizeProto } from '../utils/types'

import { Geo } from '@observablehq/plot'

export interface MapGenericProps {
    height?: string
    basemap: Basemap
}

export interface Polygon {
    name: string
    style: Record<string, unknown>
    meta: Record<string, unknown>
}
export interface Polygons {
    polygons: Polygon[]
    zoomIndex: number
}

interface MapState {
    loading: boolean
}

// eslint-disable-next-line prefer-function-component/prefer-function-component  -- TODO: Maps don't support function components yet.
export class MapGeneric<P extends MapGenericProps> extends React.Component<P, MapState> {
    private polygon_by_name = new Map<string, GeoJSON.Feature>()

    private delta = 0.25
    private version = 0
    private last_modified = 0
    private basemap_props: null | Basemap = null
    protected map: maplibregl.Map | undefined = undefined
    private exist_this_time: string[] = []
    private id: string

    constructor(props: P) {
        super(props)
        this.id = `map-${Math.random().toString(36).substring(2)}`
        this.state = { loading: true }
    }

    override render(): ReactNode {
        return (
            <>
                <input type="hidden" data-test-loading={this.state.loading} />
                <MapBody id={this.id} height={this.props.height} buttons={this.buttons()} />
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
        // const map = new maplibregl.Map(this.id, {
        //     layers: [], center: new maplibregl.LatLng(0, 0), zoom: 0,
        //     zoomSnap: this.delta, zoomDelta: this.delta, wheelPxPerZoomLevel: 60 / this.delta,
        // })

        const map = new maplibregl.Map({
            style: 'https://tiles.openfreemap.org/styles/liberty',
            container: this.id,
            // boxZoom: false,
            // doubleClickZoom: false,
            scrollZoom: true,
            attributionControl: false,
            // cooperativeGestures: false,
            dragRotate: false,
        })
        this.map = map
        await this.componentDidUpdate(this.props, this.state)
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

        function toSvgStyle(style: Record<string, unknown> & { weight?: number }): string {
            let svgStyle = ''
            for (const key of Object.keys(style)) {
                if (key === 'fillColor') {
                    svgStyle += `fill:${style[key]};`
                    continue
                }
                else if (key === 'fillOpacity') {
                    svgStyle += `fill-opacity:${style[key]};`
                    continue
                }
                else if (key === 'color') {
                    svgStyle += `stroke:${style[key]};`
                    continue
                }
                else if (key === 'weight') {
                    svgStyle += `stroke-width:${style[key]! / 10};`
                    continue
                }
                svgStyle += `${key}:${style[key]};`
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
        console.log('UPDATINg', version)
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
        // while (!this.map!.isStyleLoaded()) {
        //     // sleep 10ms
        //     await new Promise(resolve => setTimeout(resolve, 10))
        // }
        await this.updateFn()
    }

    async updateFn(): Promise<void> {
        this.setState({ loading: true })

        const map = this.map!
        this.exist_this_time = []

        this.attachBasemap()

        const { polygons, zoomIndex } = await this.computePolygons()

        await this.addPolygons(map, polygons, zoomIndex)

        await this.mapDidRender()

        // Remove polygons that no longer exist
        for (const [name] of this.polygon_by_name.entries()) {
            if (!this.exist_this_time.includes(name)) {
                console.log('Removing', name)
                this.polygon_by_name.delete(name)
            }
        }
        this.updateSources()
        this.setState({ loading: false })
    }

    attachBasemap(): void {
        if (JSON.stringify(this.props.basemap) === JSON.stringify(this.basemap_props)) {
            return
        }
        this.basemap_props = this.props.basemap
        // if (this.basemap_layer !== null) {
        //     this.map!.removeLayer(this.basemap_layer)
        //     this.basemap_layer = null
        // }
        if (this.props.basemap.type === 'none') {
            return
        }
        // const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        // const osmAttrib = '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        // this.basemap_layer = maplibregl.tileLayer(osmUrl, { maxZoom: 20, attribution: osmAttrib })
        // this.map!.addLayer(this.basemap_layer)
    }

    async addPolygons(map: maplibregl.Map, polygons: Polygon[], zoom_to: number): Promise<void> {
        /*
         * We want to parallelize polygon loading, but we also need to add the polygons in a deterministic order for testing purposes (as well as to show contained polygons atop their parent)
         * So, we start all the loads asynchronously, but actually add the polygons to the map only as they finish loading in order
         * Waiting for all the polygons to load before adding them produces an unacceptable delay
         */
        let adderIndex = 0
        const adders = new Map<number, () => void>()
        const addDone = (): void => {
            while (adders.has(adderIndex)) {
                adders.get(adderIndex)!()
                adders.delete(adderIndex)
                adderIndex++
            }
        }
        await Promise.all(polygons.map(async (polygon, i) => {
            const adder = await this.addPolygon(map, polygon, i === zoom_to)
            adders.set(i, adder)
            addDone()
        }))
        this.updateSources()
    }

    async polygonGeojson(name: string, style: object): Promise<GeoJSON.Feature> {
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

    polygonData: GeoJSON.Feature[] | null = null
    sources_last_updated = 0

    updateSources(): void {
        console.log('Updating sources')
        const source: maplibregl.GeoJSONSource = this.map!.getSource('polygon')!
        source.setData({
            type: 'FeatureCollection',
            features: Array.from(this.polygon_by_name.values()),
        })
        this.sources_last_updated = Date.now()
    }

    /*
     * Returns a function that adds the polygon.
     * The reason for this is so that we can add the polygons in a specific order independent of the order in which they end up loading
     */
    async addPolygon(map: maplibregl.Map, polygon: Polygon, fit_bounds: boolean): Promise<() => void> {
        this.exist_this_time.push(polygon.name)
        if (this.polygon_by_name.has(polygon.name)) {
            this.polygon_by_name.get(polygon.name)!.properties = { ...polygon.style, name: polygon.name }
            return () => undefined
        }
        const geojson = await this.polygonGeojson(polygon.name, polygon.style)
        if (fit_bounds) {
            console.log('Fitting bounds')
            this.zoomToItems([geojson], { duration: 0 })
        }

        this.polygon_by_name.set(polygon.name, geojson)
        return () => {
            // console.log('Adding', polygon.name)
            const time = Date.now()
            if (!map.getSource('polygon')) {
                this.polygonData = [geojson]
                map.addSource('polygon', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: this.polygonData,
                    },
                })
                map.addLayer({
                    id: 'polygon',
                    type: 'fill',
                    source: 'polygon',
                    paint: {
                        'fill-color': ['get', 'fillColor'],
                        'fill-opacity': ['get', 'fillOpacity'],
                        'fill-outline-color': ['get', 'color'],
                    },
                    // filter: ['==', '$name', polygon.name],
                })
            }
            else {
                // const data: maplibregl.GeoJSONSource = map.getSource(polygon.name)!
                // const fc: GeoJSON.FeatureCollection =
                this.polygonData!.push(geojson)
                if (Date.now() - this.sources_last_updated > 1000) {
                    this.updateSources()
                }
                // (data.data as GeoJSON.FeatureCollection).features.push(geojson)
            }
            // console.log('Source', Date.now() - time)
            // const group = maplibregl.featureGroup()
            // const leafletPolygon = maplibregl.geoJson(geojson, {
            //     style: polygon.style,
            //     // @ts-expect-error smoothFactor not included in library type definitions
            //     smoothFactor: 0.1,
            //     className: `tag-${polygon.name.replace(/ /g, '_')}`,
            // })
            const time2 = Date.now()
            // map.addLayer({
            //     id: polygon.name,
            //     type: 'fill',
            //     source: 'polygon',
            //     paint: {
            //         'fill-color': polygon.style.fillColor as string,
            //         'fill-opacity': polygon.style.fillOpacity as number,
            //         'fill-outline-color': polygon.style.color as string,
            //     },
            //     // add filter that the property longname = name
            //     filter: ['==', '$name', polygon.name],
            // })
            // console.log('Layer', Date.now() - time2)
            // map.getSource(polygon.name)!
            // TODO handle click
            // leafletPolygon.onClick('click', () => {
            //     void this.context.navigate({
            //         kind: 'article',
            //         universe: this.context.universe,
            //         longname: polygon.name,
            //     }, { history: 'push', scroll: { kind: 'element', element: this.map!.getContainer() } })
            // })
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
        console.log('BOUNDS', bounds)
        this.map?.fitBounds(bounds, options)
    }

    zoomToAll(): void {
        this.zoomToItems(this.polygon_by_name.values(), {})
    }

    zoomTo(name: string): void {
        // zoom to a specific polygon
        this.zoomToItems([this.polygon_by_name.get(name)!], {})
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
