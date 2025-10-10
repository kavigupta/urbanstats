import React, { ReactNode, useCallback, useContext, useEffect, useId, useMemo, useRef } from 'react'
import { FullscreenControl, MapRef } from 'react-map-gl/maplibre'

import 'maplibre-gl/dist/maplibre-gl.css'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { relatedSettingsKeys, relationshipKey, useSetting, useSettings } from '../page_template/settings'
import { TestUtils } from '../utils/TestUtils'
import { randomColor } from '../utils/color'
import { isHistoricalCD } from '../utils/is_historical'
import { notWaiting, waiting } from '../utils/promiseStream'
import { Feature, IRelatedButton, IRelatedButtons } from '../utils/protos'
import { NormalizeProto } from '../utils/types'

import { CommonMaplibreMap, Shape, ShapeCollection, shapeFeatureCollection, shapesId, useZoomFirstFeature } from './map-common'

interface ArticleMapProps {
    articleType: string
    related: NormalizeProto<IRelatedButtons>[]
    longname: string
}

export function ArticleMap(props: ArticleMapProps): ReactNode {
    const mapRef = useRef<MapRef>(null)

    const features = useArticleFeatures(props).use()

    const navigator = useContext(Navigator.Context)

    const clickFeature = useCallback((name: string) => {
        void navigator.navigate({
            kind: 'article',
            universe: navigator.universe,
            longname: name,
        }, { history: 'push', scroll: { kind: 'element', element: mapRef.current!.getContainer() } })
    }, [navigator])

    const readyFeatures = useMemo(() => features.filter(notWaiting), [features])
    const id = useId()

    useEffect(() => {
        TestUtils.shared.articleMaps.set(id, { clickFeature, features: readyFeatures.map(f => f.properties!.name as string) })
        return () => {
            TestUtils.shared.articleMaps.delete(id)
        }
    }, [id, clickFeature, readyFeatures])

    useZoomFirstFeature(mapRef, features)

    return (
        <CommonMaplibreMap
            id={id}
            ref={mapRef}
            interactiveLayerIds={[shapesId(id, 'fill')]}
            onMouseOver={e => e.target.getCanvas().style.cursor = 'pointer'}
            onMouseLeave={e => e.target.getCanvas().style.cursor = ''}
            onClick={(e) => {
                const feature = e.features?.find(f => f.properties.clickable !== false)
                if (feature !== undefined) {
                    clickFeature(feature.properties.name as string)
                }
            }}
        >
            <ShapeCollection features={readyFeatures} id={id} />
            <FullscreenControl position="top-left" />
        </CommonMaplibreMap>
    )
}

function useArticleFeatures({ articleType, related, longname }: ArticleMapProps): {
    use: () => (GeoJSON.Feature | typeof waiting)[]
} {
    const [showHistoricalCDs] = useSetting('show_historical_cds')
    const relatedCheckboxSettings = useSettings(relatedSettingsKeys(articleType))

    const colors = useColors()

    return useMemo(() => {
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
}
