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
                basemap={{ type: 'osm' }}
                longnames={props.syauData.longnames}
                population={props.syauData.populations}
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
    markers: Record<string, maplibregl.Marker | undefined> = {}
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
        console.log('flushing cache')
        // flush caches
        // for (const id in this.markersOnScreen) {
        //     if (!this.markersOnScreen[id]) continue
        //     this.markersOnScreen[id].remove()
        // }
        // this.markersOnScreen = {}
        // this.markers = {}
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
        console.log('updating markers')
        const map = this.map
        if (!map) return
        const newMarkers: Record<string, maplibregl.Marker | undefined> = {}
        const features = map.querySourceFeatures('centroids')

        for (const feature of features) {
            const coords: LngLatLike = (feature.geometry as GeoJSON.Point).coordinates as LngLatLike
            const props = feature.properties as { cluster_id: string, cluster: boolean, populationGuessed: number, population: number, isGuessed: number, existence: number }
            if (!props.cluster) continue
            if (this.markers[props.cluster_id]) {
                this.markers[props.cluster_id]!.remove()
            }
            const html = circleSector(
                this.props.notGuessedColor,
                this.props.guessedColor,
                circleMarkerRadius,
                2 * Math.PI * (props.populationGuessed / props.population),
                `${props.isGuessed}/${props.existence}`,
            )
            const el = document.createElement('div')
            el.innerHTML = html
            el.className = 'syau-marker'
            el.style.width = `${circleMarkerRadius * 2}px`
            el.style.height = `${circleMarkerRadius * 2}px`
            const marker = new maplibregl.Marker({
                element: el,
            }).setLngLat(coords)
            this.markers[props.cluster_id] = marker
            newMarkers[props.cluster_id] = this.markers[props.cluster_id]
            this.markers[props.cluster_id]?.addTo(map)
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
                    'circle-radius': circleMarkerRadius,
                },
            })
        }
        // if (!map.getLayer('centroid_labels')) {
        //     // only label guessed points, and only if they are not clustered
        //     map.addLayer({
        //         id: 'centroid_labels',
        //         type: 'symbol',
        //         source: 'centroids',
        //         filter: ['!=', 'cluster', true],
        //         layout: {
        //             'text-field': [
        //                 'case',
        //                 ['==', ['get', 'isGuessed'], 1],
        //                 ['get', 'name'],
        //                 '',
        //             ],
        //             'text-size': 12,
        //             // 'text-font': ['Jost Regular'],
        //             'text-offset': [0, 0.6],
        //             'text-anchor': 'top',
        //         },
        //         paint: {
        //             // text-color: this.props.guessedColor,
        //         },
        //     })
        // }
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

    // override async updateFn(): Promise<void> {
    //     const self = this
    //     this.setState({ loading: true })

    //     this.attachBasemap()
    //     await this.updateSources(true)

    //     const map = this.map!

    //     // map.setMaxZoom(20)

    //     // map.addLayer(await this.computeBasemap2())

    //     // if (this.layer !== undefined) {
    //     //     map.removeLayer(this.layer)
    //     // }
    //     // const markers = L.markerClusterGroup({
    //     //     iconCreateFunction(cluster) {
    //     //         const indices = cluster.getAllChildMarkers().map(m => (m as SYAUMarker).syauIndex)
    //     //         return self.sector(indices)
    //     //     },
    //     //     polygonOptions: {
    //     //         weight: 1.5, color: self.props.voroniHighlightColor,
    //     //     },
    //     //     maxClusterRadius: 2.5 * circleMarkerRadius,
    //     // })
    //     // for (let i = 0; i < this.props.centroids.length; i++) {
    //     //     const point = this.props.centroids[i]
    //     //     // yes I'm monkeypatching
    //     //     const marker = L.marker([point.lat!, point.lon!], {
    //     //         icon: self.sector([i]),
    //     //     })
    //     //     marker.syauIndex = i
    //     //     markers.addLayer(marker)
    //     // }
    //     // map.addLayer(markers)
    //     // this.layer = markers

    //     this.setState({ loading: false })

    //     if (this.alreadyFitBounds) {
    //         return
    //     }
    //     this.alreadyFitBounds = true

    //     // let bounds = markers.getBounds()
    //     // const h = this.mapHeight()
    //     // if (typeof h !== 'number') {
    //     //     throw new Error(`Map height is not a number; instead it is ${h}`)
    //     // }
    //     // const padding = (bounds.getNorth() - bounds.getSouth()) * circleMarkerRadius / h
    //     // bounds = bounds.pad(padding)

    //     return
    // }

    // sector(idxs: number[]): L.DivIcon {
    //     const sumpop = (is: number[]): number => is.map(idx => this.props.population[idx]).reduce((a, b) => a + b, 0)
    //     const idxsGuessed = idxs.filter(idx => this.props.isGuessed[idx])
    //     const populationGuessed = sumpop(idxsGuessed)
    //     const populationTotal = sumpop(idxs)
    //     const angleGuessed = 2 * Math.PI * (populationGuessed / populationTotal)
    //     const html = circleSector(
    //         this.props.notGuessedColor,
    //         this.props.guessedColor,
    //         circleMarkerRadius,
    //         angleGuessed,
    //         `${idxsGuessed.length}/${idxs.length}`,
    //     )
    //     return L.divIcon({
    //         html,
    //         iconSize: L.point(circleMarkerRadius * 2, circleMarkerRadius * 2),
    //         className: 'syau-marker',
    //     })
    // }
}

function createDonutChart(props: {
    mag1: number
    mag2: number
    mag3: number
    mag4: number
    mag5: number
}): HTMLElement {
    const offsets = []
    const counts = [
        props.mag1,
        props.mag2,
        props.mag3,
        props.mag4,
        props.mag5,
    ]
    let total = 0
    // eslint-disable-next-line @typescript-eslint/prefer-for-of -- whatever
    for (let i = 0; i < counts.length; i++) {
        offsets.push(total)
        total += counts[i]
    }
    const fontSize
        = total >= 1000 ? 22 : total >= 100 ? 20 : total >= 10 ? 18 : 16
    const r = total >= 1000 ? 50 : total >= 100 ? 32 : total >= 10 ? 24 : 18
    const r0 = Math.round(r * 0.6)
    const w = r * 2

    let html
        = `<div><svg width="${w
        }" height="${w
        }" viewbox="0 0 ${w
        } ${w
        }" text-anchor="middle" style="font: ${fontSize
        }px sans-serif; display: block">`

    for (let i = 0; i < counts.length; i++) {
        html += donutSegment(
            offsets[i] / total,
            (offsets[i] + counts[i]) / total,
            r,
            r0,
            colors[i],
        )
    }
    html
        += `<circle cx="${r
        }" cy="${r
        }" r="${r0
        }" fill="white" /><text dominant-baseline="central" transform="translate(${r
        }, ${r
        })">${total.toLocaleString()
        }</text></svg></div>`

    const el = document.createElement('div')
    el.innerHTML = html
    return el.firstChild as HTMLElement
}

function donutSegment(start: number, end: number, r: number, r0: number, color: string): string {
    if (end - start === 1) end -= 0.00001
    const a0 = 2 * Math.PI * (start - 0.25)
    const a1 = 2 * Math.PI * (end - 0.25)
    const x0 = Math.cos(a0),
        y0 = Math.sin(a0)
    const x1 = Math.cos(a1),
        y1 = Math.sin(a1)
    const largeArc = end - start > 0.5 ? 1 : 0

    return [
        '<path d="M',
        r + r0 * x0,
        r + r0 * y0,
        'L',
        r + r * x0,
        r + r * y0,
        'A',
        r,
        r,
        0,
        largeArc,
        1,
        r + r * x1,
        r + r * y1,
        'L',
        r + r0 * x1,
        r + r0 * y1,
        'A',
        r0,
        r0,
        0,
        largeArc,
        0,
        r + r0 * x0,
        r + r0 * y0,
        `" fill="${color}" />`,
    ].join(' ')
}
