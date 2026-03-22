import stableStringify from 'json-stable-stringify'
import React, { ReactNode, useMemo, useState } from 'react'

import { PolygonFeatureCollection, polygonFeatureCollection } from '../components/map-common'
import { notWaiting } from '../utils/promiseStream'
import { ICoordinate } from '../utils/protos'

import { SyauClusterMap } from './syau-cluster-map'

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
        <SyauClusterMap
            centroidsData={centroidsData}
            mapBoundsCentroids={props.centroids}
            guessedColor={props.guessedColor}
            notGuessedColor={props.notGuessedColor}
            onVisibleUnclusteredChange={setPolysOnScreen}
        >
            <PolygonFeatureCollection features={readyFeatures} clickable={false} />
        </SyauClusterMap>
    )
}
