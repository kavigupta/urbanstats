import React from 'react';

export { Map };

import { shape_link, article_link } from "../navigation/links.js";
import { relationship_key } from "./related-button.js";
import { random_color } from "../utils/color.js";

import "./map.css";
import { is_historical_cd } from '../utils/is_historical.js';

class Map extends React.Component {
    constructor(props) {
        super(props);
        this.polygon_by_name = {};
        this.already_fit_bounds = false;
    }

    render() {
        return (
            <div id={this.props.id} className="map"></div>
        );
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
        await this.add_polygon(map, this.props.longname, !this.already_fit_bounds, { "interactive": false },
            true,
            false);
        this.already_fit_bounds = true;
        await this.add_related_polygons(map, this.get_related("contained_by"));
        await this.add_related_polygons(map, this.get_related("intersects"));
        await this.add_related_polygons(map, this.get_related("borders"));
        await this.add_related_polygons(map, this.get_related("contains"));

        // Remove polygons that no longer exist
        for (let name in this.polygon_by_name) {
            if (!this.exist_this_time.includes(name)) {
                map.removeLayer(this.polygon_by_name[name]);
                delete this.polygon_by_name[name];
            }
        }
    }

    get_related(key) {
        const element = this.props.related.filter(
            (x) => x.relationshipType == key)
            .map((x) => x.buttons)[0];
        return element;
    }

    async add_related_polygons(map, related) {
        for (let i = related.length - 1; i >= 0; i--) {
            if (!this.props.settings.show_historical_cds && is_historical_cd(related[i].rowType)) {
                continue;
            }
            let key = relationship_key(this.props.article_type, related[i].rowType);
            if (!this.props.settings[key]) {
                continue;
            }

            const color = random_color(related[i].longname);
            await this.add_polygon(map,
                related[i].longname,
                false,
                { color: color, weight: 1, fillColor: color, fillOpacity: 0.1 },
                true);
        }
    }

    async add_polygon(map, name, fit_bounds, style, add_callback = false, add_to_bottom = true) {
        this.exist_this_time.push(name);
        if (name in this.polygon_by_name) {
            return;
        }
        // https://stackoverflow.com/a/35970894/1549476
        const polys = await fetch(shape_link(name))
            .then(res => res.json());
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