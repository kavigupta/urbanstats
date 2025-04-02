import React, { ReactNode, useContext } from 'react'

import '../common.css'

import { CountsByUT } from '../components/countsByArticleType'
import { MapGeneric, MapGenericProps, Polygons } from '../components/map'
import { GenericSearchBox } from '../components/search-generic'
import type_ordering_idx from '../data/type_ordering_idx'
import universes_ordered from '../data/universes_ordered'
import { Navigator } from '../navigation/Navigator'
import { useColors, useJuxtastatColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { StoredProperty } from '../quiz/quiz'
import { Feature, ICoordinate } from '../utils/protos'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { confirmMatch, populationColumns, SYAUData } from './load'

import maplibregl, { ExpressionSpecification, LngLatLike } from 'maplibre-gl'

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
    const colors = useColors()
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
                basemap={{ type: 'osm', disableBasemap: true }}
                longnames={props.syauData.longnames}
                population={props.syauData.populations}
                populationOrdinals={props.syauData.populationOrdinals}
                centroids={props.syauData.centroids}
                isGuessed={props.syauData.longnames.map(name => history.guessed.includes(name))}
                guessedColor={jColors.correct}
                notGuessedColor={jColors.incorrect}
                voroniHighlightColor={colors.hueColors.blue}
            />
        </div>
    )
}
function SelectType(props: { typ?: string, universe?: string, counts: CountsByUT }): ReactNode {
    const types = Object.keys(type_ordering_idx).filter(
        type => props.universe === undefined || populationColumns(props.counts, type, props.universe).length > 0,
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
        universe => props.typ === undefined || populationColumns(props.counts, props.typ, universe).length > 0,
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

function singleSector(radius: number, startAngle: number, endAngle: number, color2: string): string {
    const startx = radius + radius * Math.cos(startAngle)
    const starty = radius + radius * Math.sin(startAngle)
    const endx = radius + radius * Math.cos(endAngle)
    const endy = radius + radius * Math.sin(endAngle)
    return `<path d="M${radius},${radius} L${startx},${starty} A${radius},${radius} 1 0,1 ${endx},${endy} z" fill="${color2}"></path>`
}

function circleSector(color1: string, color2: string, radius: number, sizeAngle: number, text: string): string {
    let startAngle = -Math.PI / 2
    const singleSectors = []
    const target = startAngle + sizeAngle
    let endAngle = Math.min(target, startAngle + Math.PI / 2)
    for (let i = 0; i < 4; i++) {
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
        '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width: 100%; text-align: center; font-weight: 500" class="serif">',
        text,
        '</div>',
        '</div>',
    ]

    return result.join('')
}

// type SYAUMarker = L.Marker & { syauIndex: number }

interface SYAUMapProps extends MapGenericProps {
    longnames: string[]
    population: number[]
    populationOrdinals: number[]
    centroids: ICoordinate[]
    isGuessed: boolean[]
    guessedColor: string
    notGuessedColor: string
    voroniHighlightColor: string
}

const mag1 = ['<', ['get', 'mag'], 2] satisfies ExpressionSpecification
const mag2 = ['all', ['>=', ['get', 'mag'], 2], ['<', ['get', 'mag'], 3]] satisfies ExpressionSpecification
const mag3 = ['all', ['>=', ['get', 'mag'], 3], ['<', ['get', 'mag'], 4]] satisfies ExpressionSpecification
const mag4 = ['all', ['>=', ['get', 'mag'], 4], ['<', ['get', 'mag'], 5]] satisfies ExpressionSpecification
const mag5 = ['>=', ['get', 'mag'], 5] satisfies ExpressionSpecification

const colors = ['#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c']

class SYAUMap extends MapGeneric<SYAUMapProps> {
    private alreadyFitBounds: boolean = false
    // private layer: L.LayerGroup | undefined = undefined

    name_to_index: undefined | Map<string, number>
    markersOnScreen: Record<string, maplibregl.Marker | undefined> = {}
    updateAttached: boolean = false

    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- override
    override loadShape(name: string): Promise<NormalizeProto<Feature>> {
        throw new Error('Not implemented! Instead polygonGeojson is overridden')
    }

    override computePolygons(): Promise<Polygons> {
        return Promise.resolve({
            polygons: [],
            zoomIndex: -1,
        })
    }

    updateCentroidsSource(map: maplibregl.Map): maplibregl.GeoJSONSource {
        const data = {
            type: 'FeatureCollection',
            features: this.props.centroids.map((c, idx) => ({
                type: 'Feature',
                properties: {
                    name: this.props.longnames[idx],
                    population: this.props.population[idx],
                    populationGuessed: this.props.isGuessed[idx] ? this.props.population[idx] : 0,
                    isGuessed: this.props.isGuessed[idx] ? 1 : 0,
                    existence: 1,
                    populationOrdinal: this.props.populationOrdinals[idx],
                },
                geometry: {
                    type: 'Point',
                    coordinates: [c.lon!, c.lat!],
                },
            })),
        } satisfies GeoJSON.FeatureCollection
        let source: maplibregl.GeoJSONSource | undefined = map.getSource('centroids')
        if (!source) {
            map.addSource('centroids', {
                type: 'geojson',
                data,
                cluster: true,
                clusterMaxZoom: 14,
                clusterRadius: 80,
                clusterProperties: {
                    // keep counts of population and guessed status in a cluster
                    population: ['+', ['get', 'population']],
                    populationGuessed: ['+', ['get', 'populationGuessed']],
                    isGuessed: ['+', ['get', 'isGuessed']],
                    existence: ['+', ['get', 'existence']],
                },
            })
            source = map.getSource('centroids')!
        }
        else {
            if (!(source instanceof maplibregl.GeoJSONSource)) {
                throw new Error('Source is not a GeoJSON source')
            }
            source.setData(data)
        }
        return source
    }

    fitBounds(map: maplibregl.Map): void {
        if (this.alreadyFitBounds) {
            return
        }
        const bounds = [[
            this.props.centroids.map(c => c.lon!).reduce((a, b) => Math.min(a, b), 1000),
            this.props.centroids.map(c => c.lat!).reduce((a, b) => Math.min(a, b), 1000),
        ], [
            this.props.centroids.map(c => c.lon!).reduce((a, b) => Math.max(a, b), -1000),
            this.props.centroids.map(c => c.lat!).reduce((a, b) => Math.max(a, b), -1000),
        ]] as [[number, number], [number, number]]
        map.fitBounds(bounds, { animate: false })
        this.alreadyFitBounds = true
    }

    updateMarkers(): void {
        const map = this.map
        if (!map) return
        const newMarkers: Record<string, maplibregl.Marker | undefined> = {}
        const features = map.querySourceFeatures('centroids')

        console.log('features', features)

        for (const feature of features) {
            const coords: LngLatLike = (feature.geometry as GeoJSON.Point).coordinates as LngLatLike
            const props = feature.properties as (
                { populationGuessed: number, population: number, isGuessed: number, existence: number }
                &
                // eslint-disable-next-line no-restricted-syntax -- cluster_id comes from maplibre and is out of our control
                ({ cluster: true, cluster_id: string } | { cluster: undefined, name: string, populationOrdinal: number })
            )
            const id = props.cluster ? props.cluster_id : props.name
            console.log('props', props)
            // if (!props.cluster) continue
            if (this.markersOnScreen[id]) {
                this.markersOnScreen[id].remove()
            }
            let text: string
            if (props.cluster) {
                text = `${props.isGuessed}/${props.existence}`
            }
            else if (props.isGuessed) {
                text = `#${props.populationOrdinal}`
            }
            else {
                text = `?`
            }
            const html = circleSector(
                this.props.notGuessedColor,
                this.props.guessedColor,
                circleMarkerRadius,
                2 * Math.PI * (props.populationGuessed / props.population),
                text,
            )
            const el = document.createElement('div')
            el.innerHTML = html
            el.className = 'syau-marker'
            el.style.width = `${circleMarkerRadius * 2}px`
            el.style.height = `${circleMarkerRadius * 2}px`
            const marker = new maplibregl.Marker({
                element: el,
            }).setLngLat(coords)
            // the assignment to markersOnScreen is necessary in case multiple of these updates are running at once
            // might be better to simply not allow that to happen.
            newMarkers[id] = this.markersOnScreen[id] = marker
            newMarkers[id].addTo(map)
        }
        for (const id in this.markersOnScreen) {
            if (!newMarkers[id]) this.markersOnScreen[id]?.remove()
        }
        this.markersOnScreen = newMarkers
    }

    addLayersIfNeeded(map: maplibregl.Map): void {
        if (!map.getLayer('centroid_circle')) {
            // circle and symbol layers for rendering individual centroids (unclustered points)
            map.addLayer({
                id: 'centroid_circle',
                type: 'circle',
                source: 'centroids',
                filter: ['!=', 'cluster', true],
                paint: {
                    'circle-color': [
                        'case',
                        ['==', ['get', 'isGuessed'], 1],
                        this.props.guessedColor,
                        this.props.notGuessedColor,
                    ],
                    'circle-radius': 0,
                },
            })
        }
    }

    override async populateMap(map: maplibregl.Map): Promise<void> {
        await this.stylesheetPresent()

        this.fitBounds(map)
        const source = this.updateCentroidsSource(map)
        this.addLayersIfNeeded(map)
        if (!this.updateAttached) {
            this.updateAttached = true
            map.on('move', () => { this.updateMarkers() })
            map.on('moveend', () => { this.updateMarkers() })
            source.on('data', () => { this.updateMarkers() })
        }
    }
}
