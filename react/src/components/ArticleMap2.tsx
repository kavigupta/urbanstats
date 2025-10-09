import React, { ReactNode, useContext, useEffect, useId, useMemo, useRef } from 'react'
import { FullscreenControl, Layer, MapRef, Source, useMap, Map } from 'react-map-gl/maplibre'

import 'maplibre-gl/dist/maplibre-gl.css'
import { boundingBox, geometry } from '../map-partition'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { relatedSettingsKeys, relationshipKey, useSetting, useSettings } from '../page_template/settings'
import { randomColor } from '../utils/color'
import { isHistoricalCD } from '../utils/is_historical'
import { notWaiting, promiseStream, waiting } from '../utils/promiseStream'
import { Feature, IRelatedButton, IRelatedButtons } from '../utils/protos'
import { loadShapeFromPossibleSymlink as loadFeatureFromPossibleSymlink } from '../utils/symlinks'
import { NormalizeProto } from '../utils/types'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { defaultMapPadding } from './map'
import { mapBorderRadius, mapBorderWidth } from './screenshot'

export function ArticleMap2({ articleType, related, longname }: { articleType: string, related: NormalizeProto<IRelatedButtons>[], longname: string }): ReactNode {
    const colors = useColors()

    const mapRef = useRef<MapRef>(null)

    const [showHistoricalCDs] = useSetting('show_historical_cds')
    const relatedCheckboxSettings = useSettings(relatedSettingsKeys(articleType))

    const featuresStream = useMemo(() => {
        const getRelated = (key: string): NormalizeProto<IRelatedButton>[] => {
            const element = related.filter(
                x => x.relationshipType === key)
                .map(x => x.buttons)[0]
            return element
        }

        const relateds = [
            ...getRelated('contained_by'),
            ...getRelated('intersects'),
            ...getRelated('borders'),
            ...getRelated('contains'),
            ...getRelated('same_geography'),
        ]

        const relatedShapes = (() => {
            const result: Shape[] = []
            for (let i = relateds.length - 1; i >= 0; i--) {
                if (!showHistoricalCDs && isHistoricalCD(relateds[i].rowType)) {
                    continue
                }
                const key = relationshipKey(articleType, relateds[i].rowType)
                if (!relatedCheckboxSettings[key]) {
                    continue
                }

                const color = randomColor(relateds[i].longname)
                result.push({
                    name: relateds[i].longname,
                    color, weight: 1, fillColor: color, fillOpacity: 0.1,
                })
            }
            return result
        })()

        const color = colors.hueColors.blue

        return shapeFeatureCollection([
            {
                name: longname,
                fillOpacity: 0.5, weight: 1, color, fillColor: color,
                clickable: false,
            },
            ...relatedShapes,
        ])
    }, [articleType, colors.hueColors.blue, longname, related, relatedCheckboxSettings, showHistoricalCDs])

    const features = featuresStream.use()

    useEffect(() => {
        if (features.length === 0 || features[0] === waiting) {
            return
        }
        mapRef.current?.fitBounds(boundingBox(features[0].geometry), { animate: false, padding: defaultMapPadding })
    }, [features])

    const navigator = useContext(Navigator.Context)

    const shapeCollectionId = useId()

    const readyFeatures = useMemo(() => features.filter(notWaiting), [features])

    return (
        <Map
            ref={mapRef}
            style={{
                width: '100%',
                height: 400,
                borderRadius: mapBorderRadius,
                border: `${mapBorderWidth}px solid ${colors.borderNonShadow}`,
            }}
            mapStyle="https://tiles.openfreemap.org/styles/bright"
            interactiveLayerIds={[shapesId(shapeCollectionId, 'fill')]}
            onMouseOver={e => e.target.getCanvas().style.cursor = 'pointer'}
            onMouseLeave={e => e.target.getCanvas().style.cursor = ''}
            onClick={(e) => {
                const feature = e.features?.find(f => f.properties.clickable !== false)
                if (feature !== undefined) {
                    void navigator.navigate({
                        kind: 'article',
                        universe: navigator.universe,
                        longname: feature.properties.name as string,
                    }, { history: 'push', scroll: { kind: 'element', element: e.target.getContainer() } })
                }
            }}
            canvasContextAttributes={{
                preserveDrawingBuffer: true, // Allows screenshots
            }}
        >
            <ShapeCollection features={readyFeatures} id={shapeCollectionId} />
            <FullscreenControl position="top-left" />
        </Map>
    )
}

export interface Shape {
    name: string
    clickable?: boolean

    // Style
    fillColor: string
    fillOpacity: number
    color: string
    weight?: number
}

function shapesId(id: string, kind: 'source' | 'fill' | 'outline'): string {
    return `shapes-${kind}-${id}`
}

function ShapeCollection({ features, id }: { features: GeoJSON.Feature[], id: string }): ReactNode {
    const { current: map } = useMap()

    const labelId = useOrderedResolve(useMemo(() => map !== undefined ? firstLabelId(map) : Promise.resolve(undefined), [map]))

    const collection: GeoJSON.FeatureCollection = useMemo(() => ({
        type: 'FeatureCollection',
        features,
    }), [features])

    return (
        <>
            <Source id={shapesId(id, 'source')} type="geojson" data={collection} />
            <Layer
                id={shapesId(id, 'fill')}
                type="fill"
                source={shapesId(id, 'source')}
                paint={{
                    'fill-color': ['get', 'fillColor'],
                    'fill-opacity': ['get', 'fillOpacity'],
                }}
                beforeId={labelId}
            />
            <Layer
                id={shapesId(id, 'outline')}
                type="line"
                source={shapesId(id, 'source')}
                paint={{
                    'line-color': ['get', 'color'],
                    'line-width': ['get', 'weight'],
                }}
                beforeId={labelId}
            />
        </>
    )
}

async function shapeGeojson(shape: Shape): Promise<GeoJSON.Feature> {
    const feature = await loadFeatureFromPossibleSymlink(shape.name) as NormalizeProto<Feature>
    return {
        type: 'Feature' as const,
        properties: shape,
        geometry: geometry(feature),
    }
}

function shapeFeatureCollection(shapes: Shape[]): { use: () => (GeoJSON.Feature | typeof waiting)[] } {
    return promiseStream(shapes.map(shapeGeojson), { updateSpacing: 500 })
}

async function firstLabelId(map: MapRef): Promise<string | undefined> {
    if (!map.isStyleLoaded() || (map.style as unknown) === undefined) {
        await new Promise(resolve => map.once('style.load', resolve))
    }

    for (const layer of map.style.stylesheet.layers) {
        if (layer.type === 'symbol' && layer.id.startsWith('label')) {
            return layer.id
        }
    }
    return undefined
}
