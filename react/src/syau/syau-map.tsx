import stableStringify from 'json-stable-stringify'
import React, { ReactNode, useCallback, useMemo, useState } from 'react'

import { PolygonFeatureCollection, polygonFeatureCollection } from '../components/map-common'
import { notWaiting } from '../utils/promiseStream'
import { ICoordinate } from '../utils/protos'

import { type ClusterFeatureProperties, ClusterMap } from './syau-cluster-map'

function syauClusterMarkerLabel(featureProps: ClusterFeatureProperties & { cluster: true }): string {
    const countGuessed = featureProps.countCategory0
    const countTotal = featureProps.countCategory1 + featureProps.countCategory0
    return `${countGuessed}/${countTotal}`
}

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
    const [polysOnScreen, setPolysOnScreen] = useState<{ idxIntoCentroids: number, category: number }[]>([])

    const categoryColors = [props.guessedColor, props.notGuessedColor]

    const categories = useMemo(() => props.isGuessed.map(isGuessed => isGuessed ? 1 : 0), [props.isGuessed])

    const syauUnclusteredMarkerLabel = useCallback((featureProps: ClusterFeatureProperties & { cluster: undefined }): string => {
        return featureProps.countCategory0 === 1 ? `#${props.populationOrdinals[featureProps.idxIntoCentroids]}` : '?'
    }, [props.populationOrdinals])

    const features = useMemo(() => polygonFeatureCollection(polysOnScreen.map(({ idxIntoCentroids, category }) => ({
        name: props.longnames[idxIntoCentroids],
        fillColor: categoryColors[category],
        fillOpacity: 0.5,
        color: categoryColors[category],
        weight: 2,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only want to reload these when polys actually change
    }))), [stableStringify(polysOnScreen), props.guessedColor, props.notGuessedColor]).use()

    const readyFeatures = useMemo(() => features.filter(notWaiting), [features])

    return (
        <ClusterMap
            categories={categories}
            population={props.population}
            centroids={props.centroids}
            categoryColors={categoryColors}
            clusterMarkerLabel={syauClusterMarkerLabel}
            unclusteredMarkerLabel={syauUnclusteredMarkerLabel}
            onVisibleUnclusteredChange={setPolysOnScreen}
        >
            <PolygonFeatureCollection features={readyFeatures} clickable={false} />
        </ClusterMap>
    )
}
