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
    }

    render() {
        return (
            <div id={this.props.id} className="map"></div>
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

    async componentDidMount() {
        var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            osmAttrib = '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            osm = L.tileLayer(osmUrl, { maxZoom: 20, attribution: osmAttrib });
        const map = new L.Map(this.props.id, { layers: [osm], center: new L.LatLng(0, 0), zoom: 0 });
        this.map = map;
        await this.componentDidUpdate();
    }

    async componentDidUpdate() {
        const map = this.map;
        this.exist_this_time = [];

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

    async add_polygons(map, names, styles, zoom_to) {
        for (let i = 0; i < names.length; i++) {
            await this.add_polygon(map, names[i], i == zoom_to, styles[i]);
        }
    }

    async add_polygon(map, name, fit_bounds, style, add_callback = true, add_to_bottom = false) {
        this.exist_this_time.push(name);
        if (name in this.polygon_by_name) {
            return;
        }
        // https://stackoverflow.com/a/35970894/1549476
        let polys = await loadProtobuf(shape_link(name), "FeatureCollection");
        polys = polys.features.map(
            poly => {
                return {
                    "type": poly.type, "coordinates": poly.rings.map(
                        ring => ring.coords.map(
                            coordinate => [coordinate.lon, coordinate.lat]
                        )
                    )
                };
            }
        );
        let geojson = {
            "type": "FeatureCollection",
            "features": polys.map((x) => {
                return {
                    "type": "Feature",
                    "properties": {},
                    "geometry": x,
                };

            }),
        };
        let group = new L.featureGroup();
        let polygon = L.geoJson(geojson, style);
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

            // const current_time_millis = new Date().getTime();
            // console.log(related[i].longname + current_time_millis)
            const color = random_color(related[i].longname);
            const style = { color: color, weight: 1, fillColor: color, fillOpacity: 0.1 };
            names.push(related[i].longname);
            styles.push(style);
        }
        return [names, styles];
    }

}