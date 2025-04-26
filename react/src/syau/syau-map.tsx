import maplibregl, { LngLatLike } from 'maplibre-gl'

import { MapGeneric, MapGenericProps, MapState, Polygons } from '../components/map'
import { ICoordinate } from '../utils/protos'

const circleMarkerRadius = 20

interface SYAUMapProps extends MapGenericProps {
    longnames: string[]
    population: number[]
    populationOrdinals: number[]
    centroids: ICoordinate[]
    isGuessed: boolean[]
    guessedColor: string
    notGuessedColor: string
    voroniHighlightColor: string
}

export class SYAUMap extends MapGeneric<SYAUMapProps> {
    private alreadyFitBounds: boolean = false
    // private layer: L.LayerGroup | undefined = undefined
    name_to_index: undefined | Map<string, number>
    markersOnScreen: Record<string, maplibregl.Marker | undefined> = {}
    polysOnScreen: { name: string, isGuessed: boolean }[] = []
    updateAttached: boolean = false

    override computePolygons(): Promise<Polygons> {
        return Promise.resolve({
            polygons: this.polysOnScreen.map(({ name, isGuessed }) => ({
                name,
                style: {
                    fillColor: isGuessed ? this.props.guessedColor : this.props.notGuessedColor,
                    fillOpacity: 0.5,
                    color: isGuessed ? this.props.guessedColor : this.props.notGuessedColor,
                    weight: 2,
                },
                notClickable: true,
                meta: {},
            })),
            zoomIndex: -1,
        })
    }

    override async componentDidUpdate(prevProps: SYAUMapProps, prevState: MapState): Promise<void> {
        if (
            prevProps.longnames.length !== this.props.longnames.length
            || prevProps.longnames.map((l, i) => l !== this.props.longnames[i]).some(x => x)
        ) {
            this.alreadyFitBounds = false
        }
        await super.componentDidUpdate(prevProps, prevState)
    }

    updateCentroidsSource(map: maplibregl.Map): maplibregl.GeoJSONSource {
        const data = {
            type: 'FeatureCollection',
            features: this.props.centroids.map((c, idx) => ({
                type: 'Feature',
                properties: {
                    name: this.props.longnames[idx],
                    population: this.props.population[idx],
                    populationGuessed: this.props.isGuessed[idx] ? this.props.population[idx] : 0,
                    isGuessed: this.props.isGuessed[idx] ? 1 : 0,
                    existence: 1,
                    populationOrdinal: this.props.populationOrdinals[idx],
                },
                geometry: {
                    type: 'Point',
                    coordinates: [c.lon!, c.lat!],
                },
            })),
        } satisfies GeoJSON.FeatureCollection
        let source: maplibregl.GeoJSONSource | undefined = map.getSource('centroids')
        if (!source) {
            map.addSource('centroids', {
                type: 'geojson',
                data,
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: circleMarkerRadius * 2.5,
                clusterProperties: {
                    // keep counts of population and named status in a cluster
                    population: ['+', ['get', 'population']],
                    populationGuessed: ['+', ['get', 'populationGuessed']],
                    isGuessed: ['+', ['get', 'isGuessed']],
                    existence: ['+', ['get', 'existence']],
                },
            })
            source = map.getSource('centroids')!
        }
        else {
            if (!(source instanceof maplibregl.GeoJSONSource)) {
                throw new Error('Source is not a GeoJSON source')
            }
            source.setData(data)
        }
        return source
    }

    fitBounds(map: maplibregl.Map): void {
        if (this.alreadyFitBounds) {
            return
        }
        const longs = optimizeWrapping(this.props.centroids.map(c => c.lon!))
        const lats = this.props.centroids.map(c => c.lat!)
        let minLon = Math.min(...longs)
        let minLat = Math.min(...lats)
        let maxLon = Math.max(...longs)
        let maxLat = Math.max(...lats)
        const lonRange = maxLon - minLon
        const latRange = maxLat - minLat
        const padPct = 0.1
        minLon -= lonRange * padPct
        minLat -= latRange * padPct
        maxLon += lonRange * padPct
        maxLat += latRange * padPct
        const bounds = [[minLon, minLat], [maxLon, maxLat]] as [[number, number], [number, number]]
        map.fitBounds(bounds, { animate: false })
        this.alreadyFitBounds = true
    }

    updateMarkers(): void {
        const map = this.map
        if (!map) return
        const newMarkers: Record<string, maplibregl.Marker | undefined> = {}
        const features = map.querySourceFeatures('centroids')

        const oldMarkers = { ...this.markersOnScreen }

        const polysOnScreen: { name: string, isGuessed: boolean }[] = []

        for (const feature of features) {
            const coords: LngLatLike = (feature.geometry as GeoJSON.Point).coordinates as LngLatLike
            const props = feature.properties as (
                { populationGuessed: number, population: number, isGuessed: number, existence: number } &

                // eslint-disable-next-line no-restricted-syntax -- cluster_id comes from maplibre and is out of our control
                ({ cluster: true, cluster_id: string } | { cluster: undefined, name: string, populationOrdinal: number }))
            const id = props.cluster ? props.cluster_id : props.name
            // if (!props.cluster) continue
            if (oldMarkers[id]) {
                oldMarkers[id].remove()
            }
            let text: string
            if (props.cluster) {
                text = `${props.isGuessed}/${props.existence}`
            }
            else {
                polysOnScreen.push({
                    name: props.name,
                    isGuessed: props.isGuessed === 1,
                })
                if (props.isGuessed) {
                    text = `#${props.populationOrdinal}`
                }
                else {
                    text = `?`
                }
            }
            const html = circleSector(
                this.props.notGuessedColor,
                this.props.guessedColor,
                circleMarkerRadius,
                2 * Math.PI * (props.populationGuessed / props.population),
                text,
            )
            const el = document.createElement('div')
            el.innerHTML = html
            el.className = 'syau-marker'
            el.style.width = `${circleMarkerRadius * 2}px`
            el.style.height = `${circleMarkerRadius * 2}px`
            const marker = new maplibregl.Marker({
                element: el,
            }).setLngLat(coords)
            // the assignment to markersOnScreen is necessary in case multiple of these updates are running at once
            // might be better to simply not allow that to happen.
            newMarkers[id] = oldMarkers[id] = marker
            newMarkers[id].addTo(map)
        }
        for (const id in oldMarkers) {
            if (!newMarkers[id]) oldMarkers[id]?.remove()
        }
        this.markersOnScreen = newMarkers
        polysOnScreen.sort((a, b) => {
            if (a.name < b.name) return -1
            if (a.name > b.name) return 1
            return 0
        })
        if (JSON.stringify(polysOnScreen) !== JSON.stringify(this.polysOnScreen)) {
            this.polysOnScreen = polysOnScreen
            void this.bumpVersion()
        }
    }

    addLayersIfNeeded(map: maplibregl.Map): void {
        if (!map.getLayer('centroid_circle')) {
            // circle and symbol layers for rendering individual centroids (unclustered points)
            map.addLayer({
                id: 'centroid_circle',
                type: 'circle',
                source: 'centroids',
                filter: ['!=', 'cluster', true],
                paint: {
                    'circle-color': [
                        'case',
                        ['==', ['get', 'isGuessed'], 1],
                        this.props.guessedColor,
                        this.props.notGuessedColor,
                    ],
                    'circle-radius': 0,
                },
            })
        }
    }

    override async populateMap(map: maplibregl.Map, timeBasis: number): Promise<void> {
        await super.populateMap(map, timeBasis)
        await this.stylesheetPresent()

        this.fitBounds(map)
        const source = this.updateCentroidsSource(map)
        this.addLayersIfNeeded(map)
        if (!this.updateAttached) {
            this.updateAttached = true
            map.on('move', () => { this.updateMarkers() })
            map.on('moveend', () => { this.updateMarkers() })
            source.on('data', () => { this.updateMarkers() })
        }
    }
}

function circleSector(color1: string, color2: string, radius: number, sizeAngle: number, text: string): string {
    let startAngle = -Math.PI / 2
    const singleSectors = []
    const target = startAngle + sizeAngle
    let endAngle = Math.min(target, startAngle + Math.PI / 2)
    for (let i = 0; i < 4; i++) {
        singleSectors.push(singleSector(radius, startAngle, endAngle, color2))
        if (endAngle === target) {
            break
        }
        startAngle = endAngle
        endAngle = Math.min(target, startAngle + Math.PI / 2)
    }

    const result = [
        '<div>',
        `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${radius * 2} ${radius * 2}">`,
        `<circle cx="${radius}" cy="${radius}" r="${radius}" fill="${color1}"></circle>`,
        ...singleSectors,
        '</svg>',
        '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width: 100%; text-align: center; font-weight: 500" class="serif">',
        text,
        '</div>',
        '</div>',
    ]

    return result.join('')
}

function singleSector(radius: number, startAngle: number, endAngle: number, color2: string): string {
    const startx = radius + radius * Math.cos(startAngle)
    const starty = radius + radius * Math.sin(startAngle)
    const endx = radius + radius * Math.cos(endAngle)
    const endy = radius + radius * Math.sin(endAngle)
    return `<path d="M${radius},${radius} L${startx},${starty} A${radius},${radius} 1 0,1 ${endx},${endy} z" fill="${color2}"></path>`
}

function optimizeWrapping(lons: number[]): number[] {
    const lonsAboutIDL = lons.map(lon => lon > 0 ? lon - 360 : lon)
    const range = (xs: number[]): number => Math.max(...xs) - Math.min(...xs)
    if (range(lons) < range(lonsAboutIDL)) {
        return lons
    }
    return lonsAboutIDL
}
