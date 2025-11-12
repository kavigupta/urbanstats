import React, { ReactNode, useMemo, useState } from 'react'
import { FullscreenControl, MapRef } from 'react-map-gl/maplibre'

import 'maplibre-gl/dist/maplibre-gl.css'
import { useColors } from '../page_template/colors'
import { relatedSettingsKeys, relationshipKey, useSettings } from '../page_template/settings'
import { randomColor } from '../utils/color'
import { notWaiting, waiting } from '../utils/promiseStream'
import { IRelatedButton, IRelatedButtons } from '../utils/protos'
import { isAllowedToBeShown } from '../utils/restricted-types'
import { NormalizeProto } from '../utils/types'

import { CommonMaplibreMap, Polygon, PolygonFeatureCollection, polygonFeatureCollection, useZoomFirstFeature } from './map-common'

interface ArticleMapProps {
    articleType: string
    related: NormalizeProto<IRelatedButtons>[]
    longname: string
}

export function ArticleMap(props: ArticleMapProps): ReactNode {
    const [mapRef, setMapRef] = useState<MapRef | null>(null)

    const features = useArticleFeatures(props).use()

    const readyFeatures = useMemo(() => features.filter(notWaiting), [features])

    useZoomFirstFeature(mapRef, features)

    return (
        <CommonMaplibreMap
            ref={setMapRef}
        >
            <PolygonFeatureCollection features={readyFeatures} clickable={true} />
            <FullscreenControl position="top-left" />
        </CommonMaplibreMap>
    )
}

function useArticleFeatures({ articleType, related, longname }: ArticleMapProps): {
    use: () => (GeoJSON.Feature | typeof waiting)[]
} {
    const settings = useSettings(['show_historical_cds', 'show_person_circles'])
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
            const result: Polygon[] = []
            for (let i = relateds.length - 1; i >= 0; i--) {
                if (!isAllowedToBeShown(relateds[i].rowType, settings)) {
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

        return polygonFeatureCollection([
            {
                name: longname,
                fillOpacity: 0.5, weight: 1, color, fillColor: color,
                clickable: false,
            },
            ...relatedShapes,
        ])
    }, [articleType, colors.hueColors.blue, longname, related, relatedCheckboxSettings, settings])
}
