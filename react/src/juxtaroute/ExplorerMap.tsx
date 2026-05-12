import React, { ReactNode, useMemo, useState, useEffect } from 'react'
import { FullscreenControl, MapRef } from 'react-map-gl/maplibre'

import 'maplibre-gl/dist/maplibre-gl.css'
import { CommonMaplibreMap, PolygonFeatureCollection, polygonFeatureCollection, useZoomAllFeatures } from '../components/map-common'
import { RelativeLoader } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { notWaiting, waiting } from '../utils/promiseStream'

interface ExplorerMapProps {
    currentZip?: string
    neighbors: string[]
    onSelectNeighbor: (longname: string) => void
}

export function ExplorerMap(props: ExplorerMapProps): ReactNode {
    const [mapRef, setMapRef] = useState<MapRef | null>(null)
    const colors = useColors()

    const polygons = useMemo(() => {
        const result = props.currentZip === undefined
            ? []
            : [
                    {
                        name: props.currentZip,
                        fillColor: colors.hueColors.blue,
                        fillOpacity: 0.6,
                        color: colors.hueColors.blue,
                        weight: 2,
                        clickable: false,
                    },
                ]

        for (const neighbor of props.neighbors) {
            result.push({
                name: neighbor,
                fillColor: colors.hueColors.red,
                fillOpacity: 0.2,
                color: colors.hueColors.red,
                weight: 1,
                clickable: true,
            })
        }
        return result
    }, [props.currentZip, props.neighbors, colors])

    const featuresStream = useMemo(() => polygonFeatureCollection(polygons), [polygons])
    const features = featuresStream.use()
    console.log('Features:', features)
    const readyFeatures = useMemo(() => features.filter(notWaiting), [features])

    useZoomAllFeatures(mapRef, features, readyFeatures)

    const loading = features.length > 0 && features.some(f => f === waiting)

    // Handle clicks on neighbors
    useEffect(() => {
        if (!mapRef) return

        const onClick = (e: any) => {
            const feature = e.features?.[0]
            if (feature?.properties.clickable) {
                props.onSelectNeighbor(feature.properties.name)
            }
        }

        // The layer ID is generated in PolygonFeatureCollection using useId,
        // which makes it hard to target here.
        // But PolygonFeatureCollection already handles navigation by default.
        // We might need to override the click behavior or use the default navigation
        // and detect the URL change?
        // Actually, for a game, we want to stay on the same page but update state.

        // Let's use a trick: PolygonFeatureCollection uses context navigator.
        // If we provide a custom navigator context, we can intercept the navigation.
    }, [mapRef, props])

    return (
        <div style={{ position: 'relative', height: 400 }}>
            <RelativeLoader loading={loading} />
            <CommonMaplibreMap
                ref={setMapRef}
            >
                <PolygonFeatureCollection
                    features={readyFeatures}
                    clickable={true}
                />
                <FullscreenControl position="top-left" />
            </CommonMaplibreMap>
        </div>
    )
}
