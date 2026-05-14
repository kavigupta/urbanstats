import React, { ReactNode, useState, useEffect, useContext } from 'react'

import { ArticleStatisticRow } from '../components/load-article'
import { SearchBox } from '../components/search'
import { Navigator } from '../navigation/Navigator'
import { PageTemplate } from '../page_template/template'

import { ExplorerMap } from './ExplorerMap'
import { fetchZipStats, fetchZipNeighbors } from './data'
import { fetchUrbanAreaZips } from './urbanArea'

export function Juxtaroute({ urbanArea }: { urbanArea?: string }): ReactNode {
    const navigator = useContext(Navigator.Context)
    const [areaZips, setAreaZips] = useState<string[]>([])
    const [currentZip, setCurrentZip] = useState<string | undefined>(undefined)
    const [currentStats, setCurrentStats] = useState<ArticleStatisticRow[]>([])
    const [neighbors, setNeighbors] = useState<string[]>([])
    const [hand, setHand] = useState<any[]>([])

    useEffect(() => {
        if (urbanArea) {
            void fetchUrbanAreaZips(urbanArea).then((zips) => {
                setAreaZips(zips)
                if (zips.length > 0) setCurrentZip(zips[Math.floor(Math.random() * zips.length)])
            })
        }
    }, [urbanArea])

    useEffect(() => {
        if (currentZip) {
            void fetchZipStats(currentZip).then(setCurrentStats)
            void fetchZipNeighbors(currentZip).then(setNeighbors)
        }
    }, [currentZip])

    if (!urbanArea) {
        return (
            <PageTemplate>
                <h1>Select Urban Area</h1>
                <SearchBox
                    autoFocus={true}
                    placeholder="Search for an Urban Area"
                    style={{ width: '100%', maxWidth: '400px' }}
                    articleLink={longname => ({
                        href: '#',
                        onClick: async (e) => {
                            e?.preventDefault()
                            await navigator.navigate({ kind: 'juxtaroute', urbanArea: longname }, { history: 'push', scroll: { kind: 'none' } })
                        },
                    })}
                />
            </PageTemplate>
        )
    }

    return (
        <PageTemplate>
            <h1>
                Juxtaroute:
                {urbanArea}
            </h1>
            <p>
                Current ZIP:
                {currentZip ?? 'Select a starting ZIP'}
            </p>
            <ExplorerMap
                currentZip={currentZip}
                neighbors={neighbors}
                onSelectNeighbor={(n) => { setCurrentZip(n) }}
            />
        </PageTemplate>
    )
}
