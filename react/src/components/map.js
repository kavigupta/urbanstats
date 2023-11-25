import React from 'react';

export { Map, MapGeneric };

import { shape_link, article_link } from "../navigation/links.js";
import { relationship_key } from "./related-button.js";
import { random_color } from "../utils/color.js";

import "./map.css";
import { is_historical_cd } from '../utils/is_historical.js';
import { loadProtobuf } from '../load_json.js';

class MapGeneric extends React.Component {
    constructor(props) {
        super(props);
        this.polygon_by_name = {};
        this.delta = 0.25;
        this.version = 0;
        this.last_modified = new Date(0);
        this.basemap_layer = null;
        this.basemap_props = null;
    }

    render() {
        return (
            <div id={this.props.id} className="map" style={{ background: "white", height: this.props.height || 400 }}></div>
        );
    }

    async compute_polygons() {
        /**
         * Should return [names, styles, zoom_index]
         * names: list of names of polygons to draw
         * styles: list of styles for each polygon
         * zoom_index: index of polygon to zoom to, or -1 if none 
         */
        throw "compute_polygons not implemented";
    }

    async mapDidRender() {
        /**
         * Called after the map is rendered
         */
    }

    async loadShape(name) {
        return await loadProtobuf(shape_link(name), "Feature")
    }

    async componentDidMount() {
        const map = new L.Map(this.props.id, {
            layers: [], center: new L.LatLng(0, 0), zoom: 0,
            zoomSnap: this.delta, zoomDelta: this.delta, wheelPxPerZoomLevel: 60 / this.delta
        });
        this.map = map;
        await this.componentDidUpdate();
    }

    async componentDidUpdate() {
        await this.updateToVersion(this.version + 1);
    }

    async updateToVersion(version) {
        if (version <= this.version) {
            return;
        }
        // check if at least 1s has passed since last update
        const now = new Date();
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
        const map = this.map;
        this.exist_this_time = [];

        this.attachBasemap();

        const [names, styles, zoom_index] = await this.compute_polygons();

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
        if (JSON.stringify(this.props.basemap) == JSON.stringify(this.basemap_props)) {
            return;
        }
        this.basemap_props = this.props.basemap;
        if (this.basemap_layer != null) {
            this.map.removeLayer(this.basemap_layer);
            this.basemap_layer = null;
        }
        if (this.props.basemap.type == "none") {
            return;
        }
        const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const osmAttrib = '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors';
        this.basemap_layer = L.tileLayer(osmUrl, { maxZoom: 20, attribution: osmAttrib });
        this.map.addLayer(this.basemap_layer);
    }

    async add_polygons(map, names, styles, zoom_to) {
        for (let i = 0; i < names.length; i++) {
            await this.add_polygon(map, names[i], i == zoom_to, styles[i]);
        }
    }

    async polygon_geojson(name) {
        // https://stackoverflow.com/a/35970894/1549476
        let poly = await this.loadShape(name);
        if (poly.geometry == "multipolygon") {
            const polys = poly.multipolygon.polygons;
            const coords = polys.map(
                poly => poly.rings.map(
                    ring => ring.coords.map(
                        coordinate => [coordinate.lon, coordinate.lat]
                    )
                )
            );
            poly = {
                "type": "MultiPolygon",
                "coordinates": coords,
            }
        } else if (poly.geometry == "polygon") {
            const coords = poly.polygon.rings.map(
                ring => ring.coords.map(
                    coordinate => [coordinate.lon, coordinate.lat]
                )
            );
            poly = {
                "type": "Polygon",
                "coordinates": coords,
            }
        } else {
            throw "unknown shape type";
        }
        let geojson = {
            "type": "Feature",
            "properties": {},
            "geometry": poly,
        }
        return geojson;
    }

    async add_polygon(map, name, fit_bounds, style, add_callback = true, add_to_bottom = false) {
        this.exist_this_time.push(name);
        if (name in this.polygon_by_name) {
            this.polygon_by_name[name].setStyle(style);
            return;
        }
        let geojson = await this.polygon_geojson(name);
        let group = new L.featureGroup();
        let polygon = L.geoJson(geojson, { style: style, smoothFactor: 0.1 });
        if (add_callback) {
            polygon = polygon.on("click", function (e) {
                window.location.href = article_link(name);
            });
        }

        group.addLayer(polygon, add_to_bottom);
        if (fit_bounds) {
            map.fitBounds(group.getBounds(), { "animate": false });
        }
        map.addLayer(group);
        this.polygon_by_name[name] = group;
    }
}

class Map extends MapGeneric {
    constructor(props) {
        super(props);

        this.already_fit_bounds = false;
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
        styles.push({ "interactive": false });

        const [related_names, related_styles] = this.related_polygons(relateds);
        names.push(...related_names);
        styles.push(...related_styles);

        const zoom_index = this.already_fit_bounds != this.props.longname ? 0 : -1;

        return [names, styles, zoom_index];
    }

    async mapDidRender() {
        this.already_fit_bounds = this.props.longname;
    }

    get_related(key) {
        if (this.props.related === undefined) {
            return [];
        }
        const element = this.props.related.filter(
            (x) => x.relationshipType == key)
            .map((x) => x.buttons)[0];
        return element;
    }

    related_polygons(related) {
        const names = [];
        const styles = [];
        for (let i = related.length - 1; i >= 0; i--) {
            if (!this.props.settings.show_historical_cds && is_historical_cd(related[i].rowType)) {
                continue;
            }
            let key = relationship_key(this.props.article_type, related[i].rowType);
            if (!this.props.settings[key]) {
                continue;
            }


            const color = random_color(related[i].longname);
            const style = { color: color, weight: 1, fillColor: color, fillOpacity: 0.1 };
            names.push(related[i].longname);
            styles.push(style);
        }
        return [names, styles];
    }

}