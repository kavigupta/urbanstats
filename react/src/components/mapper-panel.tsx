import '../common.css'
import './article.css'

import { gzipSync } from 'zlib'

import React, { ReactNode, useContext, useEffect, useRef, useState } from 'react'

import insets from '../data/insets'
import valid_geographies from '../data/mapper/used_geographies'
import statNames from '../data/statistic_name_list'
import universes_ordered from '../data/universes_ordered'
import { loadProtobuf } from '../load_json'
import { Keypoints, Ramp, parseRamp } from '../mapper/ramps'
import { Basemap, ColorStat, ColorStatDescriptor, FilterSettings, LineStyle, MapSettings, MapperSettings, parseColorStat } from '../mapper/settings'
import { Navigator } from '../navigation/Navigator'
import { consolidatedShapeLink, consolidatedStatsLink } from '../navigation/links'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { Universe } from '../universe'
import { interpolateColor } from '../utils/color'
import { assert } from '../utils/defensive'
import { ConsolidatedShapes, ConsolidatedStatistics, Feature, IAllStats, IFeature } from '../utils/protos'
import { useHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import type { Inset, Insets } from './map'
import { MapGeneric, MapGenericProps, Polygons, MapHeight } from './map'
import { Statistic } from './table'

interface DisplayedMapProps extends MapGenericProps {
    colorStat: ColorStat
    filter: ColorStat | undefined
    geographyKind: typeof valid_geographies[number]
    universe: string
    underlyingShapes: Promise<ConsolidatedShapes>
    underlyingStats: Promise<ConsolidatedStatistics>
    ramp: Ramp
    rampCallback: (newRamp: EmpiricalRamp) => void
    lineStyle: LineStyle
    basemap: Basemap
    height: MapHeight | undefined
    colors: Colors
}

interface ShapesForUniverse {
    shapes: NormalizeProto<IFeature>[]
    nameToIndex: Map<string, number>
}

async function loadShapes(geographyKind: typeof valid_geographies[number], universe: string): Promise<ShapesForUniverse> {
    const universeIdx = universes_ordered.indexOf(universe as (typeof universes_ordered)[number])
    const shapes = (await loadProtobuf(
        consolidatedShapeLink(geographyKind),
        'ConsolidatedShapes',
    )) as NormalizeProto<ConsolidatedShapes>
    const longnames: string[] = []
    const features: NormalizeProto<IFeature>[] = []
    for (let i = 0; i < shapes.longnames.length; i++) {
        if (shapes.universes[i].universeIdxs.includes(universeIdx)) {
            longnames.push(shapes.longnames[i])
            features.push(shapes.shapes[i])
        }
    }
    return { shapes: features, nameToIndex: new Map(longnames.map((r, i) => [r, i])) }
}

interface Shapes { geographyKind: string, universe: string, data: Promise<ShapesForUniverse> }

class DisplayedMap extends MapGeneric<DisplayedMapProps> {
    private shapes: undefined | Shapes

    private getShapes(): Shapes {
        if (this.shapes && this.shapes.geographyKind === this.props.geographyKind && this.shapes.universe === this.props.universe) {
            return this.shapes
        }

        this.shapes = { geographyKind: this.props.geographyKind, universe: this.props.universe, data: (async () => {
            return loadShapes(this.props.geographyKind, this.props.universe)
        })() }

        return this.shapes
    }

    override async loadShape(name: string): Promise<NormalizeProto<Feature>> {
        const { nameToIndex, shapes } = await this.getShapes().data
        const index = nameToIndex.get(name)
        assert(index !== undefined && index >= 0 && index < shapes.length, `Shape ${name} not found in ${this.getShapes().geographyKind} for ${this.getShapes().universe}`)
        const data = shapes[index]
        return data as NormalizeProto<Feature>
    }

    override async computePolygons(): Promise<Polygons> {
        // reset index
        // this.name_to_index = undefined
        // await this.guaranteeNameToIndex()

        const lineStyle = this.props.lineStyle

        let stats: { stats: NormalizeProto<IAllStats>[], longnames: string[] } = (await this.props.underlyingStats) as NormalizeProto<ConsolidatedStatistics>
        // TODO correct this!
        const shapes = await this.getShapes().data
        const hasShapeMask = stats.longnames.map(name => shapes.nameToIndex.has(name))
        stats = {
            stats: stats.stats.filter((_, i) => hasShapeMask[i]),
            longnames: stats.longnames.filter((_, i) => hasShapeMask[i]),
        }
        if (this.props.filter !== undefined) {
            const filterVals = this.props.filter.compute(stats.stats)
            stats = {
                stats: stats.stats.filter((x, i) => filterVals[i]),
                longnames: stats.longnames.filter((x, i) => filterVals[i]),
            }
        }
        const statVals = this.props.colorStat.compute(stats.stats)
        const names = stats.longnames
        const [ramp, interpolations] = this.props.ramp.createRamp(statVals)
        this.props.rampCallback({ ramp, interpolations })
        const colors = statVals.map(
            val => interpolateColor(ramp, val, this.props.colors.mapInvalidFillColor),
        )
        const styles = colors.map(
            // no outline, set color fill, alpha=1
            color => ({
                fillColor: color,
                fillOpacity: 1,
                color: lineStyle.color,
                opacity: 1,
                weight: lineStyle.weight,
            }),
        )
        const metas = statVals.map((x) => { return { statistic: x } })
        // TODO: this is messy, but I don't want to rewrite the above
        return {
            polygons: names.map((name, i) => ({
                name,
                style: styles[i],
                meta: metas[i],
            })),
            zoomIndex: -1,
        }
    }

    override progressivelyLoadPolygons(): boolean {
        return false
    }
}

function Colorbar(props: { name: string, ramp: EmpiricalRamp | undefined }): ReactNode {
    // do this as a table with 10 columns, each 10% wide and
    // 2 rows. Top one is the colorbar, bottom one is the
    // labels.
    const colors = useColors()
    if (props.ramp === undefined) {
        return <div></div>
    }
    const values = props.ramp.interpolations

    const createValue = (stat: number): ReactNode => {
        return (
            <div className="centered_text">
                <Statistic
                    statname={props.name}
                    value={stat}
                    isUnit={false}
                />
                <Statistic
                    statname={props.name}
                    value={stat}
                    isUnit={true}
                />
            </div>
        )
    }

    return (
        <div>
            <table style={{ width: '100%', height: '100%' }}>
                <tbody>
                    <tr>
                        {
                            values.map((x, i) => (
                                <td
                                    key={i}
                                    style={
                                        {
                                            width: '10%', height: '1em',
                                            backgroundColor: interpolateColor(props.ramp!.ramp, x, colors.mapInvalidFillColor),
                                        }
                                    }
                                >
                                </td>
                            ))
                        }
                    </tr>
                    <tr>
                        {
                            values.map((x, i) => (
                                <td key={i} style={{ width: '10%', height: '1em' }}>
                                    {createValue(x)}
                                </td>
                            ))
                        }
                    </tr>
                </tbody>
            </table>
            <div className="centered_text">
                {props.name}
            </div>
        </div>
    )
}

interface MapComponentProps {
    underlyingShapes: Promise<ConsolidatedShapes>
    underlyingStats: Promise<ConsolidatedStatistics>
    geographyKind: typeof valid_geographies[number]
    universe: Universe
    ramp: Ramp
    colorStat: ColorStatDescriptor | undefined
    filter: FilterSettings
    mapRef: React.RefObject<DisplayedMap>
    lineStyle: LineStyle
    basemap: Basemap
}

interface EmpiricalRamp {
    ramp: Keypoints
    interpolations: number[]
}

// Web Mercator projection functions
function lngToWebMercatorX(lng: number): number {
    return lng * Math.PI / 180 * 6378137
}

function latToWebMercatorY(lat: number): number {
    return 6378137 * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))
}

function computeAspectRatio(coordBox: [number, number, number, number]): number {
    // coordBox is [west, south, east, north]
    const x1 = lngToWebMercatorX(coordBox[0])
    const x2 = lngToWebMercatorX(coordBox[2])
    const y1 = latToWebMercatorY(coordBox[1])
    const y2 = latToWebMercatorY(coordBox[3])

    const width = Math.abs(x2 - x1)
    const height = Math.abs(y2 - y1)

    return width / height
}

function area(coordBox: [number, number, number, number]): number {
    // coordBox is [west, south, east, north]
    const x1 = lngToWebMercatorX(coordBox[0])
    const x2 = lngToWebMercatorX(coordBox[2])
    const y1 = latToWebMercatorY(coordBox[1])
    const y2 = latToWebMercatorY(coordBox[3])

    return Math.abs((x2 - x1) * (y2 - y1))
}

function computeAspectRatioForInsets(ins: Insets): number {
    const mapsWithCoordBox = ins.filter(inset => inset.coordBox !== undefined) as (Inset & { coordBox: [number, number, number, number] })[]
    assert(mapsWithCoordBox.length > 0, 'No insets with coordBox')

    const biggestMap = mapsWithCoordBox.reduce((prev, curr) => {
        return area(curr.coordBox) > area(prev.coordBox) ? curr : prev
    })
    const coordBox = biggestMap.coordBox
    return computeAspectRatio(coordBox)
}

function loadInset(universe: Universe): Insets {
    const insetsU = insets[universe]
    assert(insetsU.length > 0, `No insets for universe ${universe}`)
    assert(insetsU[0].mainMap, `No main map for universe ${universe}`)
    const insetsProc = insetsU.map((inset) => {
        return {
            bottomLeft: [inset.bottomLeft[0], inset.bottomLeft[1]],
            topRight: [inset.topRight[0], inset.topRight[1]],
            // copy to get rid of readonly
            coordBox: [...inset.coordBox],
            mainMap: inset.mainMap,
        } satisfies Inset
    })
    return insetsProc
}

function MapComponent(props: MapComponentProps): ReactNode {
    const colors = useColors()
    const colorStat = parseColorStat(nameToIndex, props.colorStat)
    const filter = props.filter.enabled ? parseColorStat(nameToIndex, props.filter.function) : undefined

    const [empiricalRamp, setEmpiricalRamp] = useState<EmpiricalRamp | undefined>(undefined)

    const insetsU = loadInset(props.universe)

    const aspectRatio = computeAspectRatioForInsets(insetsU)

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
        }}
        >
            <div style={{ height: '90%', width: '100%' }}>
                <DisplayedMap
                    colorStat={colorStat}
                    filter={filter}
                    geographyKind={props.geographyKind}
                    universe={props.universe}
                    underlyingShapes={props.underlyingShapes}
                    underlyingStats={props.underlyingStats}
                    ramp={props.ramp}
                    rampCallback={(newRamp) => { setEmpiricalRamp(newRamp) }}
                    ref={props.mapRef}
                    lineStyle={props.lineStyle}
                    basemap={props.basemap}
                    height={{ type: 'aspect-ratio', value: aspectRatio }}
                    attribution="startVisible"
                    colors={colors}
                    insets={insetsU}
                    key={JSON.stringify(insetsU)}
                />
            </div>
            <div style={{ height: '8%', width: '100%' }}>
                <Colorbar
                    name={colorStat.name()}
                    ramp={empiricalRamp}
                />
            </div>
        </div>
    )
}

function saveAsFile(filename: string, data: string, type: string): void {
    const blob = new Blob([data], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

function Export(props: { mapRef: React.RefObject<DisplayedMap> }): ReactNode {
    const exportAsPng = async (): Promise<void> => {
        if (props.mapRef.current === null) {
            return
        }
        const pngDataUrl = await props.mapRef.current.exportAsPng()
        // Convert data URL to blob for download
        const response = await fetch(pngDataUrl)
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'map.png'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const exportAsGeoJSON = async (): Promise<void> => {
        if (props.mapRef.current === null) {
            return
        }
        const geojson = await props.mapRef.current.exportAsGeoJSON()
        saveAsFile('map.geojson', geojson, 'application/geo+json')
    }

    return (
        <div>
            <button onClick={() => {
                void exportAsPng()
            }}
            >
                Export as PNG
            </button>
            <button onClick={() => {
                void exportAsGeoJSON()
            }}
            >
                Export as GeoJSON
            </button>
            <button onClick={() => {
                // eslint-disable-next-line no-restricted-syntax -- We're opening a new window here
                const params = new URLSearchParams(window.location.search)
                params.set('view', 'true')
                // navigate to the page in a new tab
                window.open(`?${params.toString()}`, '_blank')
            }}
            >
                View as Zoomable Page
            </button>
        </div>
    )
}

const nameToIndex = new Map(statNames.map((name, i) => [name, i]))

export function MapperPanel(props: { mapSettings: MapSettings, view: boolean }): ReactNode {
    const [mapSettings, setMapSettings] = useState(props.mapSettings)

    useEffect(() => {
        // So that map settings are updated when the prop changes
        setMapSettings(props.mapSettings)
    }, [props.mapSettings])

    const [underlyingShapes, setUnderlyingShapes] = useState<Promise<ConsolidatedShapes> | undefined>(undefined)
    const [underlyingStats, setUnderlyingStats] = useState<Promise<ConsolidatedStatistics> | undefined>(undefined)

    useEffect(() => {
        if (valid_geographies.includes(mapSettings.geography_kind as typeof valid_geographies[number])) {
            setUnderlyingShapes(loadProtobuf(
                consolidatedShapeLink(mapSettings.geography_kind),
                'ConsolidatedShapes',
            ))
            setUnderlyingStats(loadProtobuf(
                consolidatedStatsLink(mapSettings.geography_kind),
                'ConsolidatedStatistics',
            ))
        }
    }, [mapSettings.geography_kind])

    const mapRef = useRef<DisplayedMap>(null)

    const jsonedSettings = JSON.stringify(mapSettings)

    const navContext = useContext(Navigator.Context)

    useEffect(() => {
        if (props.mapSettings !== mapSettings) {
            // gzip then base64 encode
            const encodedSettings = gzipSync(jsonedSettings).toString('base64')
            navContext.setMapperSettings(encodedSettings)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- props.view won't be set except from the navigator
    }, [jsonedSettings, navContext])

    const mapperPanel = (): ReactNode => {
        const ramp = parseRamp(mapSettings.ramp)
        const geographyKind = mapSettings.geography_kind as typeof valid_geographies[number]
        const universe = 'USA'
        const colorStat = mapSettings.color_stat
        const filter = mapSettings.filter

        return (underlyingShapes === undefined || underlyingStats === undefined)
            ? <div>Invalid geography kind</div>
            : (
                    <MapComponent
                        underlyingShapes={underlyingShapes}
                        underlyingStats={underlyingStats}
                        geographyKind={geographyKind}
                        universe={universe}
                        ramp={ramp}
                        colorStat={colorStat}
                        filter={filter}
                        mapRef={mapRef}
                        lineStyle={mapSettings.line_style}
                        basemap={mapSettings.basemap}
                    />
                )
    }

    const headerTextClass = useHeaderTextClass()

    if (props.view) {
        return mapperPanel()
    }

    return (
        <PageTemplate>
            <div>
                <div className={headerTextClass}>Urban Stats Mapper (beta)</div>
                <MapperSettings
                    names={statNames}
                    validGeographies={[...valid_geographies]}
                    mapSettings={mapSettings}
                    setMapSettings={setMapSettings}
                />
                <Export
                    mapRef={mapRef}
                />
                {
                    mapperPanel()
                }
            </div>
        </PageTemplate>
    )
}
