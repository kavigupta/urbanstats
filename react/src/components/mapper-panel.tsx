import '../common.css'
import './article.css'

import { gzipSync } from 'zlib'

import React, { ReactNode, useContext, useEffect, useRef, useState } from 'react'

import valid_geographies from '../data/mapper/used_geographies'
import statNames from '../data/statistic_name_list'
import { loadProtobuf } from '../load_json'
import { Keypoints, Ramp, parseRamp } from '../mapper/ramps'
import { Basemap, ColorStat, ColorStatDescriptor, FilterSettings, LineStyle, MapSettings, MapperSettings, parseColorStat } from '../mapper/settings'
import { Navigator } from '../navigation/Navigator'
import { consolidatedShapeLink, consolidatedStatsLink } from '../navigation/links'
import { PageTemplate } from '../page_template/template'
import { interpolateColor } from '../utils/color'
import { ConsolidatedShapes, ConsolidatedStatistics, Feature, IAllStats } from '../utils/protos'
import { useHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { MapGeneric, MapGenericProps, Polygons } from './map'
import { Statistic } from './table'

interface DisplayedMapProps extends MapGenericProps {
    colorStat: ColorStat
    filter: ColorStat | undefined
    geographyKind: string
    underlyingShapes: Promise<ConsolidatedShapes>
    underlyingStats: Promise<ConsolidatedStatistics>
    ramp: Ramp
    rampCallback: (newRamp: EmpiricalRamp) => void
    lineStyle: LineStyle
    basemap: Basemap
    height: string | undefined
}

class DisplayedMap extends MapGeneric<DisplayedMapProps> {
    name_to_index: undefined | Map<string, number>

    async guaranteeNameToIndex(): Promise<void> {
        if (this.name_to_index === undefined) {
            const result = (await this.props.underlyingShapes).longnames
            this.name_to_index = new Map(result.map((r, i) => [r, i]))
        }
    }

    override async loadShape(name: string): Promise<NormalizeProto<Feature>> {
        await this.guaranteeNameToIndex()
        const index = this.name_to_index!.get(name)!
        const data = (await this.props.underlyingShapes).shapes[index]
        return data as NormalizeProto<Feature>
    }

    override async computePolygons(): Promise<Polygons> {
        // reset index
        this.name_to_index = undefined
        await this.guaranteeNameToIndex()

        const lineStyle = this.props.lineStyle

        let stats: { stats: NormalizeProto<IAllStats>[], longnames: string[] } = (await this.props.underlyingStats) as NormalizeProto<ConsolidatedStatistics>
        // TODO correct this!
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
            val => interpolateColor(ramp, val),
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

    override mapDidRender(): Promise<void> {
    // zoom map to fit united states
    // do so instantly
        this.map!.fitBounds([
            [-124.7844079, 49.3457868],
            [-66.9513812, 24.7433195],
        ], { animate: false })
        return Promise.resolve()
    }
}

function Colorbar(props: { name: string, ramp: EmpiricalRamp | undefined }): ReactNode {
    // do this as a table with 10 columns, each 10% wide and
    // 2 rows. Top one is the colorbar, bottom one is the
    // labels.
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
                                            backgroundColor: interpolateColor(props.ramp!.ramp, x),
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
    geographyKind: string
    ramp: Ramp
    colorStat: ColorStatDescriptor | undefined
    filter: FilterSettings
    mapRef: React.RefObject<DisplayedMap>
    lineStyle: LineStyle
    basemap: Basemap
    height: string | undefined
}

interface EmpiricalRamp {
    ramp: Keypoints
    interpolations: number[]
}

function MapComponent(props: MapComponentProps): ReactNode {
    const colorStat = parseColorStat(nameToIndex, props.colorStat)
    const filter = props.filter.enabled ? parseColorStat(nameToIndex, props.filter.function) : undefined

    const [empiricalRamp, setEmpiricalRamp] = useState<EmpiricalRamp | undefined>(undefined)

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: props.height,
        }}
        >
            <div style={{ height: '90%', width: '100%' }}>
                <DisplayedMap
                    colorStat={colorStat}
                    filter={filter}
                    geographyKind={props.geographyKind}
                    underlyingShapes={props.underlyingShapes}
                    underlyingStats={props.underlyingStats}
                    ramp={props.ramp}
                    rampCallback={(newRamp) => { setEmpiricalRamp(newRamp) }}
                    ref={props.mapRef}
                    lineStyle={props.lineStyle}
                    basemap={props.basemap}
                    height={props.height}
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
    const exportAsSvg = async (): Promise<void> => {
        if (props.mapRef.current === null) {
            return
        }
        const svg = await props.mapRef.current.exportAsSvg()
        saveAsFile('map.svg', svg, 'image/svg+xml')
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
                void exportAsSvg()
            }}
            >
                Export as SVG
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
        if (valid_geographies.includes(mapSettings.geography_kind)) {
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

    const mapperPanel = (height: string | undefined): ReactNode => {
        const ramp = parseRamp(mapSettings.ramp)
        const geographyKind = mapSettings.geography_kind
        const colorStat = mapSettings.color_stat
        const filter = mapSettings.filter
        const valid = valid_geographies.includes(geographyKind)

        return !valid
            ? <div>Invalid geography kind</div>
            : (
                    <MapComponent
                        underlyingShapes={underlyingShapes!}
                        underlyingStats={underlyingStats!}
                        geographyKind={geographyKind}
                        ramp={ramp}
                        colorStat={colorStat}
                        filter={filter}
                        mapRef={mapRef}
                        lineStyle={mapSettings.line_style}
                        basemap={mapSettings.basemap}
                        height={height}
                    />
                )
    }

    const headerTextClass = useHeaderTextClass()

    if (props.view) {
        return mapperPanel('100%')
    }

    return (
        <PageTemplate>
            <div>
                <div className={headerTextClass}>Urban Stats Mapper (beta)</div>
                <MapperSettings
                    names={statNames}
                    validGeographies={valid_geographies}
                    mapSettings={mapSettings}
                    setMapSettings={setMapSettings}
                />
                <Export
                    mapRef={mapRef}
                />
                {
                    mapperPanel(undefined) // use default height
                }
            </div>
        </PageTemplate>
    )
}
