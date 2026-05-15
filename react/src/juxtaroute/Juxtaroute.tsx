import React, { ReactNode, useState, useEffect, useContext } from 'react'

import { ArticleStatisticRow } from '../components/load-article'
import { SearchBox } from '../components/search'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'

import { Card, getInitialHand, validateMove, createCard } from './ExplorerGameEngine'
import { ExplorerMap } from './ExplorerMap'
import { fetchZipStats, fetchZipNeighbors } from './data'
import { fetchUrbanAreaZips } from './urbanArea'

interface SavedState {
    currentZip: string
    path: string[]
    hand: Card[]
}

export function Juxtaroute({ urbanArea }: { urbanArea?: string }): ReactNode {
    const navigator = useContext(Navigator.Context)
    const colors = useColors()
    const [currentZip, setCurrentZip] = useState<string | undefined>(undefined)
    const [currentStats, setCurrentStats] = useState<ArticleStatisticRow[]>([])
    const [neighbors, setNeighbors] = useState<string[]>([])
    const [hand, setHand] = useState<Card[]>([])
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
    const [message, setMessage] = useState<string | undefined>(undefined)
    const [path, setPath] = useState<string[]>([])
    const [selectedNeighbor, setSelectedNeighbor] = useState<string | undefined>(undefined)

    useEffect(() => {
        if (urbanArea) {
            const saved = localStorage.getItem(`juxtaroute_state_${urbanArea}`)
            if (saved) {
                try {
                    const parsed = JSON.parse(saved) as SavedState
                    setCurrentZip(parsed.currentZip)
                    setPath(parsed.path)
                    setHand(parsed.hand)
                    return
                }
                catch (e) {
                    console.error('Failed to load saved state', e)
                }
            }
            void fetchUrbanAreaZips(urbanArea).then((zips) => {
                if (zips.length > 0) {
                    const startZip = zips[Math.floor(Math.random() * zips.length)]
                    setCurrentZip(startZip)
                    setPath([startZip])
                }
            })
            setHand(getInitialHand(5))
        }
    }, [urbanArea])

    useEffect(() => {
        if (urbanArea && currentZip && path.length > 0 && hand.length > 0) {
            const state: SavedState = { currentZip, path, hand }
            localStorage.setItem(`juxtaroute_state_${urbanArea}`, JSON.stringify(state))
        }
    }, [urbanArea, currentZip, path, hand])

    useEffect(() => {
        if (currentZip) {
            void fetchZipStats(currentZip).then(setCurrentStats)
            void fetchZipNeighbors(currentZip).then(setNeighbors)
            setSelectedNeighbor(undefined)
        }
    }, [currentZip])

    const resetGame = (): void => {
        if (!urbanArea) return
        localStorage.removeItem(`juxtaroute_state_${urbanArea}`)
        void fetchUrbanAreaZips(urbanArea).then((zips) => {
            if (zips.length > 0) {
                const startZip = zips[Math.floor(Math.random() * zips.length)]
                setCurrentZip(startZip)
                setPath([startZip])
            }
        })
        setHand(getInitialHand(5))
        setSelectedIndices(new Set())
        setSelectedNeighbor(undefined)
        setMessage(undefined)
    }

    const toggleCard = (index: number): void => {
        const next = new Set(selectedIndices)
        if (next.has(index)) {
            next.delete(index)
        }
        else {
            next.add(index)
        }
        setSelectedIndices(next)
    }

    const handleMove = async (): Promise<void> => {
        if (!selectedNeighbor) return

        const nextStats = await fetchZipStats(selectedNeighbor)
        const selectedCards = hand.filter((_, i) => selectedIndices.has(i))

        if (selectedCards.length === 0) {
            setMessage('Select at least one card to move!')
            return
        }

        const validation = validateMove(currentStats, nextStats, selectedCards)
        if (validation.isValid) {
            setCurrentZip(selectedNeighbor)
            setPath(prev => [...prev, selectedNeighbor])
            // Remove selected cards and draw new ones
            const newHand = hand.filter((_, i) => !selectedIndices.has(i))
            while (newHand.length < 5) {
                newHand.push(createCard())
            }
            setHand(newHand)
            setSelectedIndices(new Set())
            setMessage(undefined)
        }
        else {
            setMessage(`Invalid move: ${validation.reason ?? ''}`)
        }
    }

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
            <p>
                Path:
                {' '}
                {path.join(' → ')}
            </p>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button
                    style={{ padding: '5px 10px', cursor: 'pointer' }}
                    onClick={resetGame}
                >
                    Reset Game
                </button>
            </div>
            {message && (
                <p style={{ color: colors.hueColors.red, fontWeight: 'bold' }}>
                    {message}
                </p>
            )}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {hand.map((card, i) => (
                    <div
                        key={i}
                        style={{
                            border: selectedIndices.has(i) ? `2px solid ${colors.hueColors.blue}` : `1px solid ${colors.borderNonShadow}`,
                            padding: '10px',
                            borderRadius: '5px',
                            backgroundColor: colors.slightlyDifferentBackground,
                            width: '150px',
                            cursor: 'pointer',
                        }}
                        onClick={() => { toggleCard(i) }}
                    >
                        <strong>{card.label}</strong>
                        <br />
                        {card.direction === 'higher' ? '↑ Higher' : '↓ Lower'}
                    </div>
                ))}
            </div>
            <div style={{ marginBottom: '20px' }}>
                <button
                    disabled={!selectedNeighbor || selectedIndices.size === 0}
                    style={{
                        padding: '10px 20px',
                        fontSize: '16px',
                        cursor: (!selectedNeighbor || selectedIndices.size === 0) ? 'not-allowed' : 'pointer',
                    }}
                    onClick={() => { void handleMove() }}
                >
                    Confirm Move to
                    {' '}
                    {selectedNeighbor ?? '...'}
                </button>
            </div>
            <ExplorerMap
                currentZip={currentZip}
                neighbors={neighbors}
                path={path}
                selectedNeighbor={selectedNeighbor}
                onSelectNeighbor={(n) => { setSelectedNeighbor(prev => prev === n ? undefined : n) }}
            />
        </PageTemplate>
    )
}
