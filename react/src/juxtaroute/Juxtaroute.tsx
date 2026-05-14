import React, { ReactNode, useState, useEffect, useContext } from 'react'

import { ArticleStatisticRow } from '../components/load-article'
import { SearchBox } from '../components/search'
import { Navigator } from '../navigation/Navigator'
import { PageTemplate } from '../page_template/template'

import { Card, getInitialHand } from './ExplorerGameEngine'
import { ExplorerMap } from './ExplorerMap'
import { fetchZipStats, fetchZipNeighbors } from './data'
import { fetchUrbanAreaZips } from './urbanArea'

export function Juxtaroute({ urbanArea }: { urbanArea?: string }): ReactNode {
    const navigator = useContext(Navigator.Context)
    const [currentZip, setCurrentZip] = useState<string | undefined>(undefined)
    const [currentStats, setCurrentStats] = useState<ArticleStatisticRow[]>([])
    const [neighbors, setNeighbors] = useState<string[]>([])
    const [hand, setHand] = useState<Card[]>([])

    useEffect(() => {
        if (urbanArea) {
            void fetchUrbanAreaZips(urbanArea).then((zips) => {
                if (zips.length > 0) setCurrentZip(zips[Math.floor(Math.random() * zips.length)])
            })
            setHand(getInitialHand(5))
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
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {hand.map((card, i) => (
                    <div
                        key={i}
                        style={{
                            border: '1px solid #ccc',
                            padding: '10px',
                            borderRadius: '5px',
                            backgroundColor: 'rgb(249, 249, 249)',
                            width: '150px',
                        }}
                    >
                        <strong>{card.label}</strong>
                        <br />
                        {card.direction === 'higher' ? '↑ Higher' : '↓ Lower'}
                    </div>
                ))}
            </div>
            <ExplorerMap
                currentZip={currentZip}
                neighbors={neighbors}
                onSelectNeighbor={(n) => { setCurrentZip(n) }}
            />
        </PageTemplate>
    )
}
