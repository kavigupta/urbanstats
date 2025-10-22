import stableStringify from 'json-stable-stringify'
import maplibregl from 'maplibre-gl'
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { FullscreenControl, Layer, LngLatLike, MapRef, Source, useMap } from 'react-map-gl/maplibre'

import { Basemap, CommonMaplibreMap, PolygonFeatureCollection, polygonFeatureCollection } from '../components/map-common'
import { notWaiting } from '../utils/promiseStream'
import { ICoordinate } from '../utils/protos'

const circleMarkerRadius = 20

interface SYAUMapProps {
    longnames: string[]
    population: number[]
    populationOrdinals: number[]
    centroids: ICoordinate[]
    isGuessed: boolean[]
    guessedColor: string
    notGuessedColor: string
    voroniHighlightColor: string
}

export function SYAUMap(props: SYAUMapProps): ReactNode {
    const mapRef = useRef<MapRef>(null)

    const [markersOnScreen, setMarkersOnScreen] = useState(new Map<string, maplibregl.Marker>())
    const [polysOnScreen, setPolysOnScreen] = useState<{ name: string, isGuessed: boolean }[]>([])

    const centroidsData = useMemo(() => {
        return {
            type: 'FeatureCollection',
            features: props.centroids.map((c, idx) => ({
                type: 'Feature',
                properties: {
                    name: props.longnames[idx],
                    population: props.population[idx],
                    populationGuessed: props.isGuessed[idx] ? props.population[idx] : 0,
                    isGuessed: props.isGuessed[idx] ? 1 : 0,
                    existence: 1,
                    populationOrdinal: props.populationOrdinals[idx],
                },
                geometry: {
                    type: 'Point',
                    coordinates: [c.lon!, c.lat!],
                },
            })),
        } satisfies GeoJSON.FeatureCollection
    }, [props.centroids, props.isGuessed, props.longnames, props.population, props.populationOrdinals])

    const updateMarkers = (): void => {
        const map = mapRef.current

        if (map === null) {
            return
        }

        const newMarkers = new Map<string, maplibregl.Marker>()
        const newPolys: { name: string, isGuessed: boolean }[] = []

        const features = map.querySourceFeatures('centroids')

        for (const feature of features) {
            const coords: LngLatLike = (feature.geometry as GeoJSON.Point).coordinates as LngLatLike
            const featureProps = feature.properties as (
                        { populationGuessed: number, population: number, isGuessed: number, existence: number } &

                        // eslint-disable-next-line no-restricted-syntax -- cluster_id comes from maplibre and is out of our control
                        ({ cluster: true, cluster_id: string } | { cluster: undefined, name: string, populationOrdinal: number }))
            const featureId = featureProps.cluster ? featureProps.cluster_id : featureProps.name

            let text: string
            if (featureProps.cluster) {
                text = `${featureProps.isGuessed}/${featureProps.existence}`
            }
            else {
                newPolys.push({
                    name: featureProps.name,
                    isGuessed: featureProps.isGuessed === 1,
                })
                if (featureProps.isGuessed) {
                    text = `#${featureProps.populationOrdinal}`
                }
                else {
                    text = `?`
                }
            }
            const html = circleSector(
                props.notGuessedColor,
                props.guessedColor,
                circleMarkerRadius,
                2 * Math.PI * (featureProps.populationGuessed / featureProps.population),
                text,
            )

            let existingMarker
            if ((existingMarker = markersOnScreen.get(featureId)) !== undefined) {
                existingMarker.getElement().innerHTML = html
                newMarkers.set(featureId, existingMarker)
            }
            else {
                const el = document.createElement('div')
                el.innerHTML = html
                el.className = 'syau-marker'
                el.style.width = `${circleMarkerRadius * 2}px`
                el.style.height = `${circleMarkerRadius * 2}px`
                const marker = new maplibregl.Marker({
                    element: el,
                }).setLngLat(coords)

                marker.addTo(map.getMap())

                newMarkers.set(featureId, marker)
                markersOnScreen.set(featureId, marker)
            }
        }
        for (const [oldMarkerId, oldMarker] of markersOnScreen.entries()) {
            if (!newMarkers.has(oldMarkerId)) oldMarker.remove()
        }
        setMarkersOnScreen(newMarkers)
        newPolys.sort((a, b) => {
            if (a.name < b.name) return -1
            if (a.name > b.name) return 1
            return 0
        })
        setPolysOnScreen(newPolys)
    }

    const features = useMemo(() => polygonFeatureCollection(polysOnScreen.map(({ name, isGuessed }) => ({
        name,
        fillColor: isGuessed ? props.guessedColor : props.notGuessedColor,
        fillOpacity: 0.5,
        color: isGuessed ? props.guessedColor : props.notGuessedColor,
        weight: 2,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only want to reload these when polys actually change
    }))), [stableStringify(polysOnScreen), props.guessedColor, props.notGuessedColor]).use()

    const readyFeatures = useMemo(() => features.filter(notWaiting), [features])

    return (
        <CommonMaplibreMap
            ref={mapRef}
            onMove={updateMarkers}
            onData={updateMarkers}
            style={{ height: 600 }}
        >
            <Basemap basemap={useMemo(() => ({ type: 'osm', noLabels: true }), [])} />
            <FullscreenControl position="top-left" />
            <Source
                id="centroids"
                type="geojson"
                data={centroidsData}
                cluster={true}
                clusterMaxZoom={14}
                clusterRadius={circleMarkerRadius * 2.5}
                clusterProperties={{
                    // keep counts of population and named status in a cluster
                    population: ['+', ['get', 'population']],
                    populationGuessed: ['+', ['get', 'populationGuessed']],
                    isGuessed: ['+', ['get', 'isGuessed']],
                    existence: ['+', ['get', 'existence']],
                }}
            />
            <Layer
                id="centroid_circle"
                type="circle"
                source="centroids"
                filter={['!=', 'cluster', true]}
                paint={{
                    'circle-color': [
                        'case',
                        ['==', ['get', 'isGuessed'], 1],
                        props.guessedColor,
                        props.notGuessedColor,
                    ],
                    'circle-radius': 0,
                }}
            />
            <PolygonFeatureCollection features={readyFeatures} clickable={false} />
            <FirstZoom centroids={props.centroids} />
        </CommonMaplibreMap>
    )
}

function FirstZoom(props: { centroids: SYAUMapProps['centroids'] }): ReactNode {
    const map = useMap().current!

    useEffect(() => {
        const longs = optimizeWrapping(props.centroids.map(c => c.lon!))
        const lats = props.centroids.map(c => c.lat!)
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
    }, [props.centroids, map])

    return null
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
