import React, { ReactNode, useEffect, useId, useMemo, useRef } from 'react'
import Map, { Layer, MapRef, Source, useMap } from 'react-map-gl/maplibre'

import 'maplibre-gl/dist/maplibre-gl.css'
import { boundingBox, extendBoxes, geometry } from '../map-partition'
import { useColors } from '../page_template/colors'
import { relatedSettingsKeys, relationshipKey, useSetting, useSettings } from '../page_template/settings'
import { randomColor } from '../utils/color'
import { isHistoricalCD } from '../utils/is_historical'
import { Feature, IRelatedButton, IRelatedButtons } from '../utils/protos'
import { loadShapeFromPossibleSymlink as loadFeatureFromPossibleSymlink } from '../utils/symlinks'
import { NormalizeProto } from '../utils/types'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { defaultMapPadding, Inset } from './map'
import { mapBorderRadius, mapBorderWidth } from './screenshot'

export function ArticleMap2({ articleType, related, longname }: { articleType: string, related: NormalizeProto<IRelatedButtons>[], longname: string }): ReactNode {
    const colors = useColors()

    const mapRef = useRef<MapRef>(null)

    const [showHistoricalCDs] = useSetting('show_historical_cds')
    const relatedCheckboxSettings = useSettings(relatedSettingsKeys(articleType))

    const collectionPromise = useMemo(async () => {
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

        return await shapeFeatureCollection([
            {
                name: longname,
                fillOpacity: 0.5, weight: 1, color, fillColor: color,
                clickable: false,
            },
            ...relatedShapes,
        ])
    }, [articleType, colors.hueColors.blue, longname, related, relatedCheckboxSettings, showHistoricalCDs])

    const collection = useOrderedResolve(collectionPromise)

    useEffect(() => {
        void collectionPromise.then((c) => {
            mapRef.current?.fitBounds(boundingBox(c.features[0].geometry), { animate: false, padding: defaultMapPadding })
        })
    }, [longname])

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
        >
            {collection && <ShapeCollection collection={collection} />}
        </Map>
    )
}

//     const collection = useOrderedResolve(useMemo(() => shapeFeatureCollection(shapes, inset), [shapes, inset]))

export interface Shape {
    name: string
    clickable?: boolean

    // Style
    fillColor: string
    fillOpacity: number
    color: string
    weight?: number
}

function ShapeCollection({ collection }: { collection: GeoJSON.FeatureCollection }): ReactNode {
    const id = useId()

    const { current: map } = useMap()

    const labelId = useOrderedResolve(useMemo(() => map !== undefined ? firstLabelId(map) : Promise.resolve(undefined), [map]))

    return (
        <>
            <Source id={`shapes-source-${id}`} type="geojson" data={collection} />
            <Layer
                id={`shapes-fill-layer-${id}`}
                type="fill"
                source={`shapes-source-${id}`}
                paint={{
                    'fill-color': ['get', 'fillColor'],
                    'fill-opacity': ['get', 'fillOpacity'],
                }}
                beforeId={labelId}
            />
            <Layer
                id={`shapes-outline-${id}`}
                type="line"
                source={`shapes-source-${id}`}
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

async function shapeFeatureCollection(shapes: Shape[]): Promise<GeoJSON.FeatureCollection> {
    const features = await Promise.all(shapes.map(shapeGeojson))
    return {
        type: 'FeatureCollection',
        features,
    }
}

function filterShapesInInset(features: GeoJSON.Feature[], inset?: Inset): GeoJSON.Feature[] {
    if (inset?.mainMap === false) {
        const bbox = inset.coordBox
        features = features.filter((poly) => {
            const bounds = boundingBox(poly.geometry)
            // Check if the polygon overlaps the inset bounds
            return bounds.getWest() < bbox[2] && bounds.getEast() > bbox[0]
                && bounds.getNorth() > bbox[1] && bounds.getSouth() < bbox[3]
        })
    }
    return features
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
