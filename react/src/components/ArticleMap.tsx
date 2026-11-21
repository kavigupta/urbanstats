import Color from 'color'
import indefinite from 'indefinite'
import React, { ReactNode, useMemo, useState } from 'react'
import { FullscreenControl, MapRef } from 'react-map-gl/maplibre'

import 'maplibre-gl/dist/maplibre-gl.css'
import { urlFromPageDescriptor } from '../navigation/PageDescriptor'
import { RelativeLoader } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { relatedSettingsKeys, relationshipKey, useSettings } from '../page_template/settings'
import { randomColor } from '../utils/color'
import { notWaiting, waiting } from '../utils/promiseStream'
import { IRelatedButton, IRelatedButtons } from '../utils/protos'
import { isAllowedToBeShown } from '../utils/restricted-types'
import { NormalizeProto } from '../utils/types'

import { CommonMaplibreMap, MapAttribution, Polygon, PolygonFeatureCollection, polygonFeatureCollection, useZoomFirstFeature } from './map-common'

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

    const firstFeatureWaiting = features.length > 0 && features[0] === waiting

    return (
        <>
            <div style={{ position: 'relative' }}>
                <RelativeLoader loading={firstFeatureWaiting} />
                <CommonMaplibreMap
                    ref={setMapRef}
                >
                    <PolygonFeatureCollection features={readyFeatures} clickable={true} />
                    <FullscreenControl position="top-left" />
                </CommonMaplibreMap>
            </div>
            <MapAttribution>
                <a
                    href={urlFromPageDescriptor({ kind: 'dataCredit', hash: `#shapefile_${props.articleType}` }).toString()}
                    target="_blank"
                    rel="noreferrer"
                >
                    What is
                    {' '}
                    {indefinite(props.articleType)}
                    ?
                </a>
            </MapAttribution>
        </>
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

        const relateds = (['contained_by', 'intersects', 'borders', 'contains', 'same_geography'] as const).flatMap(
            relationship => getRelated(relationship).map(button => ({ ...button, relationship })),
        )

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

                result.push({
                    name: relateds[i].longname,
                    ...atlasStyle(
                        randomColor(relateds[i].longname, Color(colors.hueColors.blue).hue(), 60),
                        0.05,
                        relateds[i].relationship === 'borders' || relateds[i].relationship === 'contained_by',
                    ),
                })
            }
            return result
        })()

        return polygonFeatureCollection([
            {
                name: longname,
                ...atlasStyle(colors.hueColors.blue, 0.25, true),
                clickable: false,
            },
            ...relatedShapes,
        ])
    }, [articleType, colors.hueColors.blue, longname, related, relatedCheckboxSettings, settings])
}

function atlasStyle(color: string, fillOpacity: number, halo: boolean): Pick<Polygon, 'color' | 'weight' | 'haloColor' | 'haloWidth' | 'fillColor' | 'fillOpacity'> {
    return {
        color: halo ? Color(color).darken(0.4).hex() : color,
        weight: 1,
        ...(halo ? { haloColor: color, haloWidth: 8 } : {}),
        fillColor: color,
        fillOpacity,
    }
}
