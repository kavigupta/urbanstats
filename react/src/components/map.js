import React from 'react';

export { Map };

import { shape_link, article_link } from "../navigation/links.js";
import { is_historical_cd } from '../utils/is_historical.js';
import { random_color } from "../utils/color.js";

import "./map.css";

class Map extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let setting = this.props.settings.show_historical_cds;
        return (
            <div id={this.props.id} just_for_caching={toString(setting)} className="map"></div>
        );
    }

    async componentDidMount() {
        var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            osmAttrib = '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            osm = L.tileLayer(osmUrl, { maxZoom: 20, attribution: osmAttrib });
        const map = new L.Map(this.props.id, { layers: [osm], center: new L.LatLng(0, 0), zoom: 0 });
        // await this.add_related_polygons(map, this.props.related.contained_by);
        await this.add_polygon(map, this.props.longname, true, { "interactive": false },
            true,
            false);
        await this.add_related_polygons(map, this.props.related.intersects);
        await this.add_related_polygons(map, this.props.related.borders);
        await this.add_related_polygons(map, this.props.related.contains);
    }

    async add_related_polygons(map, related) {
        for (let i = related.length - 1; i >= 0; i--) {
            if (!this.props.settings.show_historical_cds) {
                if (is_historical_cd(related[i].longname)) {
                    continue;
                }
            }

            const color = random_color(related[i].longname);
            await this.add_polygon(map,
                related[i].longname,
                false,
                { color: color, weight: 1, fillColor: color, fillOpacity: 0.2 / related.length },
                true);
        }
    }

    async add_polygon(map, name, fit_bounds, style, add_callback = false, add_to_bottom = true) {
        // https://stackoverflow.com/a/35970894/1549476
        const polygons = await fetch(shape_link(name))
            .then(res => res.json());
        let group = new L.featureGroup();
        for (let i = 0; i < polygons.length; i++) {
            let polygon = polygons[i];
            polygon = new L.Polygon(polygon, style);
            if (add_callback) {
                polygon = polygon.on("click", function (e) {
                    window.location.href = article_link(name);
                });
            }
            map.addLayer(polygon, add_to_bottom);
            group.addLayer(polygon);
        }
        if (fit_bounds) {
            map.fitBounds(group.getBounds(), { "animate": false });
        }
    }


}