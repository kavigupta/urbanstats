var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    osmAttrib = '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    osm = L.tileLayer(osmUrl, { maxZoom: 20, attribution: osmAttrib });
map = new L.Map('map', { layers: [osm], center: new L.LatLng(0, 0), zoom: 0 });
// get the current name of the url and replace with dat
let url = window.location.href;
// url = url[:-4] + 'dat';
url = url.substring(0, url.length - 4) + 'json';
// https://stackoverflow.com/a/35970894/1549476
fetch(url)
    .then(res => res.json())
    .then(polygons => {
        let group = new L.featureGroup();
        for (let i = 0; i < polygons.length; i++) {
            let polygon = polygons[i];
            polygon = new L.Polygon(polygon);
            map.addLayer(polygon);
            group.addLayer(polygon);
        }
        map.fitBounds(group.getBounds(), { "animate": false });
    })