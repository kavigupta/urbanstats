import React from 'react';

export { Map };

import { shape_link } from "../navigation/links.js";
import "./map.css";

class Map extends React.Component {
    constructor(props) {
        super(props);
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
        // get the current name of the url and replace with dat
        const url = shape_link(this.props.longname);
        // https://stackoverflow.com/a/35970894/1549476
        const polygons = await fetch(url)
            .then(res => res.json());
        let group = new L.featureGroup();
        for (let i = 0; i < polygons.length; i++) {
            let polygon = polygons[i];
            polygon = new L.Polygon(polygon);
            map.addLayer(polygon);
            group.addLayer(polygon);
        }
        map.fitBounds(group.getBounds(), { "animate": false });
    }
}

