import { GeoJSON2SVG } from 'geojson2svg'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import React, { ReactNode } from 'react'

import { loadProtobuf } from '../load_json'
import { Basemap } from '../mapper/settings'
import { article_link, shape_link } from '../navigation/links'
import { useColors } from '../page_template/colors'
import { relatedSettingsKeys, relationship_key, useSetting, useSettings } from '../page_template/settings'
import { UNIVERSE_CONTEXT } from '../universe'
import { random_color } from '../utils/color'
import { is_historical_cd } from '../utils/is_historical'
import { Feature, IRelatedButton, IRelatedButtons } from '../utils/protos'
import { NormalizeProto } from '../utils/types'

export interface MapGenericProps {
    height?: string
    basemap: Basemap
}

export type Polygons = Readonly<[string[], Record<string, unknown>[], Record<string, unknown>[], number]>

interface MapState {
    loading: boolean
}

// eslint-disable-next-line prefer-function-component/prefer-function-component  -- TODO: Maps don't support function components yet.
export class MapGeneric<P extends MapGenericProps> extends React.Component<P, MapState> {
    private polygon_by_name = new Map<string, L.FeatureGroup>()
    private delta = 0.25
    private version = 0
    private last_modified = Date.now()
    private basemap_layer: null | L.TileLayer = null
    private basemap_props: null | Basemap = null
    protected map: L.Map | undefined = undefined
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

    compute_polygons(): Promise<Polygons> {
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
        return await loadProtobuf(shape_link(name), 'Feature') as NormalizeProto<Feature>
    }

    override async componentDidMount(): Promise<void> {
        const map = new L.Map(this.id, {
            layers: [], center: new L.LatLng(0, 0), zoom: 0,
            zoomSnap: this.delta, zoomDelta: this.delta, wheelPxPerZoomLevel: 60 / this.delta,
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
        const [names, styles] = await this.compute_polygons()
        const map_bounds = this.map!.getBounds()
        const bounds = {
            left: map_bounds.getWest(),
            right: map_bounds.getEast(),
            top: map_bounds.getNorth(),
            bottom: map_bounds.getSouth(),
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
            let svg_style = ''
            for (const key of Object.keys(style)) {
                if (key === 'fillColor') {
                    svg_style += `fill:${style[key]};`
                    continue
                }
                else if (key === 'fillOpacity') {
                    svg_style += `fill-opacity:${style[key]};`
                    continue
                }
                else if (key === 'color') {
                    svg_style += `stroke:${style[key]};`
                    continue
                }
                else if (key === 'weight') {
                    svg_style += `stroke-width:${style[key]! / 10};`
                    continue
                }
                svg_style += `${key}:${style[key]};`
            }
            return svg_style
        }

        const overall_svg = []

        for (let i = 0; i < names.length; i++) {
            const geojson = await this.polygon_geojson(names[i])
            const svg = converter.convert(geojson, { attributes: { style: toSvgStyle(styles[i]) } })
            for (const elem of svg) {
                overall_svg.push(elem)
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
        return header + overall_svg.join('') + footer
    }

    async exportAsGeoJSON(): Promise<string> {
        const [names, , metas] = await this.compute_polygons()
        const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: [],
        }
        for (let i = 0; i < names.length; i++) {
            let feature = await this.polygon_geojson(names[i])
            feature = JSON.parse(JSON.stringify(feature)) as typeof feature
            for (const key of Object.keys(metas[i])) {
                feature.properties![key] = metas[i][key]
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
        this.setState({ loading: true })

        const map = this.map!
        this.exist_this_time = []

        this.attachBasemap()

        const [names, styles, , zoom_index] = await this.compute_polygons()

        await this.add_polygons(map, names, styles, zoom_index)

        await this.mapDidRender()

        // Remove polygons that no longer exist
        for (const [name, polygon] of this.polygon_by_name.entries()) {
            if (!this.exist_this_time.includes(name)) {
                map.removeLayer(polygon)
                this.polygon_by_name.delete(name)
            }
        }
        this.setState({ loading: false })
    }

    attachBasemap(): void {
        if (JSON.stringify(this.props.basemap) === JSON.stringify(this.basemap_props)) {
            return
        }
        this.basemap_props = this.props.basemap
        if (this.basemap_layer !== null) {
            this.map!.removeLayer(this.basemap_layer)
            this.basemap_layer = null
        }
        if (this.props.basemap.type === 'none') {
            return
        }
        const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        const osmAttrib = '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        this.basemap_layer = L.tileLayer(osmUrl, { maxZoom: 20, attribution: osmAttrib })
        this.map!.addLayer(this.basemap_layer)
    }

    async add_polygons(map: L.Map, names: string[], styles: Record<string, unknown>[], zoom_to: number): Promise<void> {
        for (let i = 0; i < names.length; i++) {
            await this.add_polygon(map, names[i], i === zoom_to, styles[i])
        }
    }

    async polygon_geojson(name: string): Promise<GeoJSON.Feature> {
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
            properties: {},
            geometry,
        }
        return geojson
    }

    async add_polygon(map: L.Map, name: string, fit_bounds: boolean, style: Record<string, unknown>, add_callback = true, add_to_bottom = false): Promise<void> {
        this.exist_this_time.push(name)
        if (this.polygon_by_name.has(name)) {
            this.polygon_by_name.get(name)!.setStyle(style)
            return
        }
        const geojson = await this.polygon_geojson(name)
        const group = L.featureGroup()
        let polygon = L.geoJson(geojson, {
            style,
            // @ts-expect-error smoothFactor not included in library type definitions
            smoothFactor: 0.1,
            className: `tag-${name.replace(/ /g, '_')}`,
        })
        if (add_callback) {
            polygon = polygon.on('click', () => {
                window.location.href = article_link(this.context, name)
            })
        }

        // @ts-expect-error Second parameter not included in library type definitions
        group.addLayer(polygon, add_to_bottom)
        if (fit_bounds) {
            map.fitBounds(group.getBounds(), { animate: false })
        }
        map.addLayer(group)
        this.polygon_by_name.set(name, group)
    }

    zoom_to_all(): void {
    // zoom such that all polygons are visible
        const bounds = new L.LatLngBounds([])
        for (const polygon of this.polygon_by_name.values()) {
            bounds.extend(polygon.getBounds())
        }
        this.map!.fitBounds(bounds)
    }

    zoom_to(name: string): void {
        // zoom to a specific polygon
        this.map!.fitBounds(this.polygon_by_name.get(name)!.getBounds())
    }

    static override contextType = UNIVERSE_CONTEXT

    declare context: React.ContextType<typeof UNIVERSE_CONTEXT>
}

const MapBody = (props: { id: string, height: string | undefined, buttons: ReactNode }): ReactNode => {
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
    article_type: string
}

interface ArticleMapProps extends MapProps {
    show_historical_cds: boolean
    settings: Record<string, unknown>
    color: string
}

// eslint-disable-next-line no-restricted-syntax -- Don't want to overwrite the JS Map
export { MapComponent as Map }
function MapComponent(props: MapProps): ReactNode {
    const colors = useColors()
    const [show_historical_cds] = useSetting('show_historical_cds')
    const related_checkbox_settings = useSettings(relatedSettingsKeys(props.article_type))
    return (
        <ArticleMap
            {...props}
            show_historical_cds={show_historical_cds}
            settings={related_checkbox_settings}
            color={colors.hueColors.blue}
        />
    )
}

class ArticleMap extends MapGeneric<ArticleMapProps> {
    private already_fit_bounds: string | undefined = undefined

    override compute_polygons(): Promise<Polygons> {
        const relateds = []
        relateds.push(...this.get_related('contained_by'))
        relateds.push(...this.get_related('intersects'))
        relateds.push(...this.get_related('borders'))
        relateds.push(...this.get_related('contains'))
        relateds.push(...this.get_related('same_geography'))

        const names = []
        const styles = []

        names.push(this.props.longname)
        styles.push({ interactive: false, fillOpacity: 0.5, weight: 1, color: this.props.color, fillColor: this.props.color })

        const [related_names, related_styles] = this.related_polygons(relateds)
        names.push(...related_names)
        styles.push(...related_styles)

        const zoom_index = this.already_fit_bounds !== this.props.longname ? 0 : -1

        const metas = names.map(() => ({}))

        return Promise.resolve([names, styles, metas, zoom_index] as const)
    }

    override mapDidRender(): Promise<void> {
        this.already_fit_bounds = this.props.longname
        return Promise.resolve()
    }

    get_related(key: string): NormalizeProto<IRelatedButton>[] {
        const element = this.props.related.filter(
            x => x.relationshipType === key)
            .map(x => x.buttons)[0]
        return element
    }

    related_polygons(related: NormalizeProto<IRelatedButton>[]): [Polygons[0], Polygons[1]] {
        const names = []
        const styles = []
        for (let i = related.length - 1; i >= 0; i--) {
            if (!this.props.show_historical_cds && is_historical_cd(related[i].rowType)) {
                continue
            }
            const key = relationship_key(this.props.article_type, related[i].rowType)
            if (!this.props.settings[key]) {
                continue
            }

            const color = random_color(related[i].longname)
            const style = { color, weight: 1, fillColor: color, fillOpacity: 0.1 }
            names.push(related[i].longname)
            styles.push(style)
        }
        return [names, styles]
    }
}
