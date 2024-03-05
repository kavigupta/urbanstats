import React, { CSSProperties, SVGProps } from 'react';

export { Map, MapGeneric };

import { shape_link, article_link } from "../navigation/links.js";
import { relationship_key } from "./related-button.js";
import { random_color } from "../utils/color.js";

import "./map.css";
import { is_historical_cd } from '../utils/is_historical.js';
import { loadProtobuf } from '../load_json.js';
import { GeoJSON2SVG } from 'geojson2svg';
import L from 'leaflet'
import { NormalizeProto } from "../utils/types.js";
import { Feature, IRelatedButton, IRelatedButtons } from "../utils/protos.js";
import { Settings } from "../page_template/settings.js";

interface BaseMap {
    type: string;
}

interface MapGenericProps {
    height: number,
    id: string,
    basemap: BaseMap,
}

class MapGeneric<P extends MapGenericProps> extends React.Component<P> {
    constructor(props: P) {
        super(props);
    }

    private polygon_by_name: Record<string, L.FeatureGroup> = {};
    private delta = 0.25;
    private version = 0;
    private last_modified = Date.now();
    private basemap_layer: null | L.TileLayer = null;
    private basemap_props: null | BaseMap = null;
    private map: L.Map | undefined = undefined
    private exist_this_time: string[] = []

    render() {
        return (
            <div id={this.props.id} className="map" style={{ background: "white", height: this.props.height || 400 }}>
                {/* place this on the right of the map */}
                <div style={
                    {zIndex: 1000, position: "absolute", right: 0, top: 0, padding: "1em"}
                }>
                    {this.buttons()}
                </div>
            </div>
        );
    }

    buttons() {
        return <></>
    }

    async compute_polygons(): Promise<Readonly<[string[], Record<string, unknown>[], Record<string, unknown>[], number]>> {
        /**
         * Should return [names, styles, metas, zoom_index]
         * names: list of names of polygons to draw
         * styles: list of styles for each polygon
         * metas: list of metadata dictionaries for each polygon
         * zoom_index: index of polygon to zoom to, or -1 if none 
         */
        throw "compute_polygons not implemented";
    }

    async mapDidRender() {
        /**
         * Called after the map is rendered
         */
    }

    async loadShape(name: string): Promise<NormalizeProto<Feature>> {
        return await loadProtobuf(shape_link(name), "Feature") as NormalizeProto<Feature>
    }

    async componentDidMount() {
        const map = new L.Map(this.props.id, {
            layers: [], center: new L.LatLng(0, 0), zoom: 0,
            zoomSnap: this.delta, zoomDelta: this.delta, wheelPxPerZoomLevel: 60 / this.delta
        });
        this.map = map;
        await this.componentDidUpdate();
    }

    /**
     * Export the map as an svg, without the background
     *
     * @returns string svg
     */
    async exportAsSvg() {
        const [names, styles] = await this.compute_polygons();
        const map_bounds = this.map!.getBounds();
        const bounds = {
            left: map_bounds.getWest(),
            right: map_bounds.getEast(),
            top: map_bounds.getNorth(),
            bottom: map_bounds.getSouth(),
        }
        const width = 1000;
        const height = width * (bounds.top - bounds.bottom) / (bounds.right - bounds.left);
        const converter = new GeoJSON2SVG({
            mapExtent: bounds, attributes: [{
                property: 'style',
                type: 'dynamic',
                key: 'style'
            }],
            viewportSize: {
                width: width,
                height: height,
            },
        });

        function toSvgStyle(style: Record<string, unknown> & { weight?: number }) {
            let svg_style = "";
            for (var key in style) {
                if (key == "fillColor") {
                    svg_style += `fill:${style[key]};`;
                    continue;
                } else if (key == "fillOpacity") {
                    svg_style += `fill-opacity:${style[key]};`;
                    continue;
                } else if (key == "color") {
                    svg_style += `stroke:${style[key]};`;
                    continue;
                } else if (key == "weight") {
                    svg_style += `stroke-width:${style[key]! / 10};`;
                    continue;
                }
                svg_style += `${key}:${style[key]};`;
            }
            return svg_style;
        }

        const overall_svg = [];

        for (let i = 0; i < names.length; i++) {
            const geojson = await this.polygon_geojson(names[i]);
            const svg = converter.convert(geojson, { attributes: { style: toSvgStyle(styles[i]) } });
            for (let j = 0; j < svg.length; j++) {
                overall_svg.push(svg[j]);
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
            xmlns:svg="http://www.w3.org/2000/svg">`;
        const footer = "</svg>";
        return header + overall_svg.join("") + footer;
    }

    async exportAsGeoJSON() {
        console.log("EXPORT AS GEOJSON")
        const [names, , metas] = await this.compute_polygons();
        const geojson: GeoJSON.FeatureCollection = {
            "type": "FeatureCollection",
            "features": [],
        };
        for (let i = 0; i < names.length; i++) {
            let feature = await this.polygon_geojson(names[i]);
            feature = JSON.parse(JSON.stringify(feature));
            for (let key in metas[i]) {
                feature.properties![key] = metas[i][key];
            }
            geojson.features.push(feature);
        }
        return JSON.stringify(geojson);
    }

    async componentDidUpdate() {
        await this.updateToVersion(this.version + 1);
    }

    async updateToVersion(version: number) {
        if (version <= this.version) {
            return;
        }
        // check if at least 1s has passed since last update
        const now = Date.now()
        const delta = now - this.last_modified;
        if (delta < 1000) {
            setTimeout(() => this.updateToVersion(version), 1000 - delta);
            return;
        }
        this.version = version;
        this.last_modified = now;
        await this.updateFn();
    }

    async updateFn() {
        const map = this.map!;
        this.exist_this_time = [];

        this.attachBasemap();

        const [names, styles, _, zoom_index] = await this.compute_polygons();

        await this.add_polygons(map, names, styles, zoom_index);

        await this.mapDidRender();

        // Remove polygons that no longer exist
        for (let name in this.polygon_by_name) {
            if (!this.exist_this_time.includes(name)) {
                map.removeLayer(this.polygon_by_name[name]);
                delete this.polygon_by_name[name];
            }
        }
    }

    attachBasemap() {
        if (JSON.stringify(this.props.basemap) === JSON.stringify(this.basemap_props)) {
            return;
        }
        this.basemap_props = this.props.basemap;
        if (this.basemap_layer != null) {
            this.map!.removeLayer(this.basemap_layer);
            this.basemap_layer = null;
        }
        if (this.props.basemap.type == "none") {
            return;
        }
        const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const osmAttrib = '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        this.basemap_layer = L.tileLayer(osmUrl, { maxZoom: 20, attribution: osmAttrib });
        this.map!.addLayer(this.basemap_layer);
    }

    async add_polygons(map: L.Map, names: string[], styles: Record<string, unknown>[], zoom_to: number) {
        for (let i = 0; i < names.length; i++) {
            await this.add_polygon(map, names[i], i == zoom_to, styles[i]);
        }
    }

    async polygon_geojson(name: string): Promise<GeoJSON.Feature> {
        // https://stackoverflow.com/a/35970894/1549476
        const poly = await this.loadShape(name);
        let geometry: GeoJSON.Geometry
        if (poly.geometry == "multipolygon") {
            const polys = poly.multipolygon.polygons;
            const coords = polys.map(
                poly => poly.rings.map(
                    ring => ring.coords.map(
                        coordinate => [coordinate.lon, coordinate.lat]
                    )
                )
            );
            geometry = {
                "type": "MultiPolygon",
                "coordinates": coords,
            }
        } else if (poly.geometry == "polygon") {
            const coords = poly.polygon.rings.map(
                ring => ring.coords.map(
                    coordinate => [coordinate.lon, coordinate.lat]
                )
            );
            geometry = {
                "type": "Polygon",
                "coordinates": coords,
            }
        } else {
            throw "unknown shape type";
        }
        const geojson = {
            "type": "Feature" as const,
            "properties": {},
            "geometry": geometry,
        }
        return geojson;
    }

    async add_polygon(map: L.Map, name: string, fit_bounds: boolean, style: Record<string, unknown>, add_callback = true, add_to_bottom = false) {
        this.exist_this_time.push(name);
        if (name in this.polygon_by_name) {
            this.polygon_by_name[name].setStyle(style);
            return;
        }
        let geojson = await this.polygon_geojson(name);
        let group = L.featureGroup();
        let polygon = L.geoJson(geojson, { 
            style: style, 
            // @ts-expect-error 
            smoothFactor: 0.1 
        });
        if (add_callback) {
            polygon = polygon.on("click", function (e) {
                window.location.href = article_link(name);
            });
        }

        // @ts-expect-error
        group.addLayer(polygon, add_to_bottom);
        if (fit_bounds) {
            map.fitBounds(group.getBounds(), { "animate": false });
        }
        map.addLayer(group);
        this.polygon_by_name[name] = group;
    }

    zoom_to_all() {
        // zoom such that all polygons are visible
        const bounds = new L.LatLngBounds([]);
        for (let name in this.polygon_by_name) {
            bounds.extend(this.polygon_by_name[name].getBounds());
        }
        this.map!.fitBounds(bounds);
    }

    zoom_to(name: string) {
        // zoom to a specific polygon
        console.log("zoom to", name);
        this.map!.fitBounds(this.polygon_by_name[name].getBounds());
    }
}

interface MapProps extends MapGenericProps {
    longname: string,
    related: NormalizeProto<IRelatedButtons>[],
    article_type: string
}

class Map extends MapGeneric<MapProps> {

    private already_fit_bounds: string | undefined = undefined;

    constructor(props: MapProps) {
        super(props);
    }

    async compute_polygons() {
        const relateds = [];
        relateds.push(...this.get_related("contained_by"));
        relateds.push(...this.get_related("intersects"));
        relateds.push(...this.get_related("borders"));
        relateds.push(...this.get_related("contains"));

        const names = [];
        const styles = [];

        names.push(this.props.longname);
        styles.push({ "interactive": false , "fillOpacity": 0.5, "weight": 1, "color": "#5a7dc3", "fillColor": "#5a7dc3" });

        const [related_names, related_styles] = this.related_polygons(relateds);
        names.push(...related_names);
        styles.push(...related_styles);

        const zoom_index = this.already_fit_bounds != this.props.longname ? 0 : -1;

        const metas = names.map((x) => { return {} });

        return [names, styles, metas, zoom_index] as const;
    }

    async mapDidRender() {
        this.already_fit_bounds = this.props.longname;
    }

    get_related(key: string) {
        if (this.props.related === undefined) {
            return [];
        }
        const element = this.props.related.filter(
            (x) => x.relationshipType == key)
            .map((x) => x.buttons)[0];
        return element;
    }

    related_polygons(related: NormalizeProto<IRelatedButton>[]) {
        const names = [];
        const styles = [];
        for (let i = related.length - 1; i >= 0; i--) {
            if (!this.context.get('show_historical_cds') && is_historical_cd(related[i].rowType)) {
                continue;
            }
            let key = relationship_key(this.props.article_type, related[i].rowType);
            if (!this.context.get(key)) {
                continue;
            }


            const color = random_color(related[i].longname);
            const style = { color: color, weight: 1, fillColor: color, fillOpacity: 0.1 };
            names.push(related[i].longname);
            styles.push(style);
        }
        return [names, styles] as const;
    }

    static contextType = Settings.Context

    declare context: React.ContextType<typeof Settings.Context>
}