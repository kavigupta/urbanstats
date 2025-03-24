import React, { ReactNode, useContext } from 'react'

import '../common.css'

import { CountsByUT } from '../components/countsByArticleType'
import { MapGeneric, MapGenericProps } from '../components/map'
import { GenericSearchBox } from '../components/search-generic'
import type_ordering_idx from '../data/type_ordering_idx'
import universes_ordered from '../data/universes_ordered'
import { Navigator } from '../navigation/Navigator'
import { useJuxtastatColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { StoredProperty } from '../quiz/quiz'
import { Feature, ICoordinate } from '../utils/protos'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { confirmMatch, populationColumn, SYAUData } from './load'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'

type Universe = string
type Type = string

type SYAUHistoryKey = `${Type}-${Universe}`

interface SYAUHistoryForGame {
    guessed: string[]
}

type SYAUHistory = Record<SYAUHistoryKey, SYAUHistoryForGame>

const circleMarkerRadius = 20

export function SYAUPanel(props: { typ?: string, universe?: string, counts: CountsByUT, syauData?: SYAUData }): ReactNode {
    const headerClass = useHeaderTextClass()
    const subHeaderClass = useSubHeaderTextClass()
    return (
        <PageTemplate>
            <div className={headerClass}>So you&apos;re an urbanist...</div>
            <div className={subHeaderClass}>
                Name every
                <SelectType typ={props.typ} universe={props.universe} counts={props.counts} />
                {' '}
                in
                <SelectUniverse typ={props.typ} universe={props.universe} counts={props.counts} />
            </div>
            {props.syauData === undefined ? undefined : <SYAUGame typ={props.typ!} universe={props.universe!} syauData={props.syauData} />}
        </PageTemplate>
    )
}

export class SYAULocalStorage {
    private constructor() {
        // Private constructor
    }

    static shared = new SYAULocalStorage()

    readonly history = new StoredProperty<SYAUHistory>(
        'syau_history',
        storedValue => JSON.parse(storedValue ?? '{}') as SYAUHistory,
        value => JSON.stringify(value),
    )

    useHistory(typ: Type, universe: Universe): [SYAUHistoryForGame, (newHistory: SYAUHistoryForGame) => void] {
        const key = `${typ}-${universe}` satisfies SYAUHistoryKey
        const history = this.history.use()
        const current: SYAUHistoryForGame = history[key] ?? { guessed: [] }
        return [current, (newHistory) => {
            this.history.value = { ...history, [key]: newHistory }
        }]
    }
}

export function SYAUGame(props: { typ: string, universe: string, syauData: SYAUData }): ReactNode {
    const jColors = useJuxtastatColors()
    const [history, setHistory] = SYAULocalStorage.shared.useHistory(props.typ, props.universe)
    const totalPopulation = props.syauData.populations.reduce((a, b) => a + b, 0)
    const totalPopulationGuessed = history.guessed.map(name => props.syauData.populations[props.syauData.longnameToIndex[name]]).reduce((a, b) => a + b, 0)

    function attemptGuess(query: string): boolean {
        const approxMatches = props.syauData.longnames.filter((_, idx) => confirmMatch(props.syauData.matchChunks[idx], query)).filter(name => !history.guessed.includes(name))
        if (approxMatches.length === 0) {
            return false
        }
        setHistory({ guessed: [...history.guessed, ...approxMatches] })
        return true
    }

    // text field for guessing, followed by a description of the % of regions guessed and what % of the population that represents
    return (
        <div>
            <div style={{ margin: 'auto', width: '50%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <input
                        type="text"
                        style={{ width: '80%' }}
                        placeholder="Type a region name"
                        onChange={(e) => {
                            if (attemptGuess(e.target.value)) {
                                e.target.value = ''
                            }
                        }}
                    />
                    <button
                        style={{ width: '20%' }}
                        onClick={() => {
                            // check if they are sure
                            if (window.confirm('Are you sure you want to reset your progress?')) {
                                setHistory({ guessed: [] })
                            }
                        }}
                    >
                        Reset progress
                    </button>
                </div>
                <div>
                    <div>
                        {history.guessed.length}
                        {' '}
                        /
                        {props.syauData.longnames.length}
                        {' '}
                        regions guessed
                    </div>
                    <div>
                        {Math.round(100 * totalPopulationGuessed / totalPopulation)}
                        % of the population guessed
                    </div>
                </div>
            </div>
            <SYAUMap
                basemap={{ type: 'osm' }}
                longnames={props.syauData.longnames}
                population={props.syauData.populations}
                centroids={props.syauData.centroids}
                isGuessed={props.syauData.longnames.map(name => history.guessed.includes(name))}
                guessedColor={jColors.correct}
                notGuessedColor={jColors.incorrect}
            />
        </div>
    )
}
function SelectType(props: { typ?: string, universe?: string, counts: CountsByUT }): ReactNode {
    const types = Object.keys(type_ordering_idx).filter(
        type => props.universe === undefined || populationColumn(props.counts, type, props.universe) !== undefined,
    )
    const navContext = useContext(Navigator.Context)
    return (
        <EditableSelector
            items={types}
            selected={props.typ}
            onSelect={
                type => navContext.link({
                    kind: 'syau',
                    typ: type,
                    universe: props.universe,
                }, { scroll: { kind: 'none' } })
            }
            placeholder="Select a region type"
        />
    )
}

function SelectUniverse(props: { typ?: string, universe?: string, counts: CountsByUT }): ReactNode {
    const navContext = useContext(Navigator.Context)
    const universes = universes_ordered.filter(
        universe => props.typ === undefined || populationColumn(props.counts, props.typ, universe) !== undefined,
    )
    return (
        <EditableSelector
            items={universes}
            selected={props.universe}
            onSelect={
                universe => navContext.link({
                    kind: 'syau',
                    typ: props.typ,
                    universe,
                }, { scroll: { kind: 'none' } })
            }
            placeholder="Select a universe"
        />
    )
}

function EditableSelector(props: {
    items: string[]
    selected: string | undefined
    onSelect: (item: string) => ReturnType<Navigator['link']>
    placeholder: string
}): ReactNode {
    let selected = props.selected
    if (selected !== undefined && !props.items.includes(selected)) {
        selected = undefined
    }
    const subHeaderClass = useSubHeaderTextClass()
    return (
        <GenericSearchBox
            matches={props.items}
            doSearch={(sq: string) => Promise.resolve(props.items.filter(type => type.toLowerCase().includes(sq.toLowerCase())))}
            link={props.onSelect}
            autoFocus={true}
            placeholder={selected ?? props.placeholder}
            style={`${subHeaderClass} syau-searchbox`}
            renderMatch={(currentMatch, onMouseOver, onClick, style, dataTestId) => (
                <div
                    key={currentMatch()}
                    style={style}
                    onClick={onClick}
                    onMouseOver={onMouseOver}
                    data-test-id={dataTestId}
                >
                    {currentMatch()}
                </div>
            )}
        />
    )
}

interface SYAUMapProps extends MapGenericProps {
    longnames: string[]
    population: number[]
    centroids: ICoordinate[]
    isGuessed: boolean[]
    guessedColor: string
    notGuessedColor: string
}

function singleSector(radius: number, startAngle: number, endAngle: number, color2: string): string {
    const startx = radius + radius * Math.cos(startAngle)
    const starty = radius + radius * Math.sin(startAngle)
    const endx = radius + radius * Math.cos(endAngle)
    const endy = radius + radius * Math.sin(endAngle)
    return `<path d="M${radius},${radius} L${startx},${starty} A${radius},${radius} 1 0,1 ${endx},${endy} z" fill="${color2}"></path>`
}

function circleSector(color1: string, color2: string, radius: number, startAngle: number, sizeAngle: number, text: string): string {
    const singleSectors = []
    const target = startAngle + sizeAngle
    let endAngle = Math.min(target, startAngle + Math.PI / 2)
    while (true) {
        singleSectors.push(singleSector(radius, startAngle, endAngle, color2))
        if (endAngle === target) {
            break
        }
        startAngle = endAngle
        endAngle = Math.min(target, startAngle + Math.PI / 2)
    }

    const result = [
        '<div>',
        `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${radius * 2} ${radius * 2}">`,
        `<circle cx="${radius}" cy="${radius}" r="${radius}" fill="${color1}"></circle>`,
        ...singleSectors,
        '</svg>',
        // place the text "ABC" over the circle
        '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width: 100%; text-align: center; font-weight: 500" class="serif">',
        text,
        '</div>',
        '</div>',
    ]

    return result.join('')
}

type SYAUMarker = L.Marker & { syauIndex: number }

class SYAUMap extends MapGeneric<SYAUMapProps> {
    private alreadyFitBounds: boolean = false
    private layer: L.LayerGroup | undefined = undefined

    name_to_index: undefined | Map<string, number>

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- override
    override loadShape(name: string): Promise<NormalizeProto<Feature>> {
        throw new Error('Not implemented! Instead polygonGeojson is overridden')
    }

    override updateFn(): Promise<void> {
        const self = this
        this.setState({ loading: true })

        this.attachBasemap()

        const map = this.map!
        if (this.layer !== undefined) {
            map.removeLayer(this.layer)
        }
        const markers = L.markerClusterGroup({
            iconCreateFunction(cluster) {
                const indices = cluster.getAllChildMarkers().map(m => (m as SYAUMarker).syauIndex)
                return self.sector(indices)
            },
        })
        for (let i = 0; i < this.props.centroids.length; i++) {
            const point = this.props.centroids[i]
            // yes I'm monkeypatching
            const marker = L.marker([point.lat!, point.lon!], {
                icon: self.sector([i]),
            }) as SYAUMarker
            marker.syauIndex = i
            markers.addLayer(marker)
        }
        map.addLayer(markers)
        this.layer = markers

        this.setState({ loading: false })

        if (this.alreadyFitBounds) {
            return Promise.resolve()
        }
        this.alreadyFitBounds = true

        let bounds = markers.getBounds()
        const h = this.mapHeight()
        if (typeof h !== 'number') {
            throw new Error(`Map height is not a number; instead it is ${h}`)
        }
        const padding = (bounds.getNorth() - bounds.getSouth()) * circleMarkerRadius / h
        bounds = bounds.pad(padding)

        map.fitBounds(bounds, { animate: false })

        return Promise.resolve()
    }

    sector(idxs: number[]): L.DivIcon {
        const sumpop = (is: number[]): number => is.map(idx => this.props.population[idx]).reduce((a, b) => a + b, 0)
        const idxsGuessed = idxs.filter(idx => this.props.isGuessed[idx])
        const populationGuessed = sumpop(idxsGuessed)
        const populationTotal = sumpop(idxs)
        const angleGuessed = 2 * Math.PI * (populationGuessed / populationTotal)
        const html = circleSector(
            this.props.notGuessedColor,
            this.props.guessedColor,
            circleMarkerRadius,
            0,
            angleGuessed,
            `${idxsGuessed.length}/${idxs.length}`,
        )
        return L.divIcon({
            html,
            className: 'syau-marker',
            iconSize: L.point(circleMarkerRadius * 2, circleMarkerRadius * 2),
        })
    }

    colorFor(idx: number): string {
        return this.props.isGuessed[idx] ? this.props.guessedColor : this.props.notGuessedColor
    }

    // override mapDidRender(): Promise <void> {
    //     if (this.already_fit_bounds) {
    //         return Promise.resolve()
    //     }
    //     this.already_fit_bounds = true
    //     // zoom map to fit all centroids
    //     return Promise.resolve()
    // }

    // override mapDidRender(): Promise<void> {
    // // zoom map to fit united states
    // // do so instantly
    //     this.map!.fitBounds([
    //         [49.3457868, -124.7844079],
    //         [24.7433195, -66.9513812],
    //     ], { animate: false })
    //     return Promise.resolve()
    // }
}
