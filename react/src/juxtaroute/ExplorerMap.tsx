import React, { ReactNode, useMemo, useState } from 'react'
import { FullscreenControl, MapRef } from 'react-map-gl/maplibre'

import 'maplibre-gl/dist/maplibre-gl.css'
import { CommonMaplibreMap, PolygonFeatureCollection, polygonFeatureCollection, useZoomAllFeatures } from '../components/map-common'
import { Navigator } from '../navigation/Navigator'
import { PageDescriptor } from '../navigation/PageDescriptor'
import { RelativeLoader } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { mixWithBackground } from '../utils/color'
import { notWaiting, waiting } from '../utils/promiseStream'

interface ExplorerMapProps {
    currentZip?: string
    neighbors: string[]
    path: string[]
    selectedNeighbor?: string
    onSelectNeighbor: (longname: string) => void
}

export function ExplorerMap(props: ExplorerMapProps): ReactNode {
    const [mapRef, setMapRef] = useState<MapRef | null>(null)
    const colors = useColors()

    const polygons = useMemo(() => {
        const result = []

        const visited = new Set(props.path)
        const neighbors = new Set(props.neighbors)

        // Current district (black/textMain) - Highest Priority
        if (props.currentZip) {
            result.push({
                name: props.currentZip,
                fillColor: colors.textMain,
                fillOpacity: 0.6,
                color: colors.textMain,
                weight: 3,
                clickable: false,
            })
            visited.delete(props.currentZip)
            neighbors.delete(props.currentZip)
        }

        // Selected neighbor (yellow) - Second Priority
        if (props.selectedNeighbor && neighbors.has(props.selectedNeighbor)) {
            result.push({
                name: props.selectedNeighbor,
                fillColor: colors.hueColors.yellow,
                fillOpacity: 0.6,
                color: colors.hueColors.yellow,
                weight: 3,
                clickable: true,
            })
            visited.delete(props.selectedNeighbor)
            neighbors.delete(props.selectedNeighbor)
        }

        // Visited districts (green) - No longer clickable
        for (const zip of visited) {
            result.push({
                name: zip,
                fillColor: colors.hueColors.green,
                fillOpacity: 0.4,
                // eslint-disable-next-line no-restricted-syntax -- Darkening color
                color: mixWithBackground(colors.hueColors.green, 0.4, '#000000'),
                weight: 2,
                clickable: false,
            })
            neighbors.delete(zip)
        }

        // Unvisited neighbors (blue)
        for (const neighbor of neighbors) {
            result.push({
                name: neighbor,
                fillColor: colors.hueColors.blue,
                fillOpacity: 0.4,
                color: colors.hueColors.blue,
                weight: 2,
                clickable: true,
            })
        }

        return result
    }, [props.currentZip, props.neighbors, props.path, props.selectedNeighbor, colors])

    const featuresStream = useMemo(() => polygonFeatureCollection(polygons), [polygons])
    const features = featuresStream.use()
    const readyFeatures = useMemo(() => features.filter(notWaiting), [features])

    useZoomAllFeatures(mapRef, features, readyFeatures)

    const loading = features.length > 0 && features.some(f => f === waiting)

    const interceptedNavigator = useMemo(() => ({
        navigate: (descriptor: PageDescriptor) => {
            if (descriptor.kind === 'article') {
                props.onSelectNeighbor(descriptor.longname)
            }
            return Promise.resolve()
        },
    } as unknown as Navigator), [props])

    return (
        <div style={{ position: 'relative', height: 400 }}>
            <RelativeLoader loading={loading} />
            <CommonMaplibreMap
                ref={setMapRef}
            >
                <Navigator.Context.Provider value={interceptedNavigator}>
                    <PolygonFeatureCollection
                        features={readyFeatures}
                        clickable={true}
                    />
                </Navigator.Context.Provider>
                <FullscreenControl position="top-left" />
            </CommonMaplibreMap>
        </div>
    )
}
