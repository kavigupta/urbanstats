import stableStringify from 'json-stable-stringify'
import React, { ReactNode, useMemo, useState } from 'react'

import { PolygonFeatureCollection, polygonFeatureCollection } from '../components/map-common'
import { notWaiting } from '../utils/promiseStream'
import { ICoordinate } from '../utils/protos'

import { syauCategoryUnnamed } from './syau-categories'
import { SyauClusterMap } from './syau-cluster-map'

interface SYAUMapProps {
    longnames: string[]
    population: number[]
    populationOrdinals: number[]
    centroids: ICoordinate[]
    /** Parallel to `longnames`; index into `categoryColors`. */
    memberCategory: readonly number[]
    /** One color per category index. */
    categoryColors: readonly string[]
}

export function SYAUMap(props: SYAUMapProps): ReactNode {
    const [polysOnScreen, setPolysOnScreen] = useState<{ name: string, category: number }[]>([])

    const centroidsData = useMemo(() => {
        return {
            type: 'FeatureCollection',
            features: props.centroids.map((c, idx) => ({
                type: 'Feature',
                properties: {
                    name: props.longnames[idx],
                    population: props.population[idx],
                    category: props.memberCategory[idx],
                    existence: 1,
                    populationOrdinal: props.populationOrdinals[idx],
                },
                geometry: {
                    type: 'Point',
                    coordinates: [c.lon!, c.lat!],
                },
            })),
        } satisfies GeoJSON.FeatureCollection
    }, [props.centroids, props.longnames, props.memberCategory, props.population, props.populationOrdinals])

    const features = useMemo(() => polygonFeatureCollection(polysOnScreen.map(({ name, category }) => ({
        name,
        fillColor: props.categoryColors[category] ?? props.categoryColors[syauCategoryUnnamed],
        fillOpacity: 0.5,
        color: props.categoryColors[category] ?? props.categoryColors[syauCategoryUnnamed],
        weight: 2,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only want to reload these when polys actually change
    }))), [stableStringify(polysOnScreen), props.categoryColors]).use()

    const readyFeatures = useMemo(() => features.filter(notWaiting), [features])

    return (
        <SyauClusterMap
            centroidsData={centroidsData}
            mapBoundsCentroids={props.centroids}
            categoryColors={props.categoryColors}
            onVisibleUnclusteredChange={setPolysOnScreen}
        >
            <PolygonFeatureCollection features={readyFeatures} clickable={false} />
        </SyauClusterMap>
    )
}
