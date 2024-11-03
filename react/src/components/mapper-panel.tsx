import '../common.css'
import './article.css'

import { gunzipSync, gzipSync } from 'zlib'

import React, { ReactNode, useEffect, useRef, useState } from 'react'

import valid_geographies from '../data/mapper/used_geographies'
import statNames from '../data/statistic_name_list'
import { loadProtobuf } from '../load_json'
import { Keypoints, Ramp, parse_ramp } from '../mapper/ramps'
import { Basemap, ColorStat, ColorStatDescriptor, FilterSettings, LineStyle, MapSettings, MapperSettings, default_settings, parse_color_stat } from '../mapper/settings'
import { consolidated_shape_link, consolidated_stats_link } from '../navigation/links'
import { PageTemplate } from '../page_template/template'
import { interpolate_color } from '../utils/color'
import { ConsolidatedShapes, ConsolidatedStatistics, Feature, IAllStats } from '../utils/protos'
import { useHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { MapGeneric, MapGenericProps, Polygons } from './map'
import { Statistic } from './table'

interface DisplayedMapProps extends MapGenericProps {
    color_stat: ColorStat
    filter: ColorStat | undefined
    geography_kind: string
    underlying_shapes: Promise<ConsolidatedShapes>
    underlying_stats: Promise<ConsolidatedStatistics>
    ramp: Ramp
    ramp_callback: (newRamp: EmpiricalRamp) => void
    line_style: LineStyle
    basemap: Basemap
    height: string | undefined
}

class DisplayedMap extends MapGeneric<DisplayedMapProps> {
    name_to_index: undefined | Map<string, number>

    async guarantee_name_to_index(): Promise<void> {
        if (this.name_to_index === undefined) {
            const result = (await this.props.underlying_shapes).longnames
            this.name_to_index = new Map(result.map((r, i) => [r, i]))
        }
    }

    override async loadShape(name: string): Promise<NormalizeProto<Feature>> {
        await this.guarantee_name_to_index()
        const index = this.name_to_index!.get(name)!
        const data = (await this.props.underlying_shapes).shapes[index]
        return data as NormalizeProto<Feature>
    }

    override async compute_polygons(): Promise<Polygons> {
    // reset index
        this.name_to_index = undefined
        await this.guarantee_name_to_index()

        const line_style = this.props.line_style

        let stats: { stats: NormalizeProto<IAllStats>[], longnames: string[] } = (await this.props.underlying_stats) as NormalizeProto<ConsolidatedStatistics>
        // TODO correct this!
        if (this.props.filter !== undefined) {
            const filter_vals = this.props.filter.compute(stats.stats)
            stats = {
                stats: stats.stats.filter((x, i) => filter_vals[i]),
                longnames: stats.longnames.filter((x, i) => filter_vals[i]),
            }
        }
        const stat_vals = this.props.color_stat.compute(stats.stats)
        const names = stats.longnames
        const [ramp, interpolations] = this.props.ramp.create_ramp(stat_vals)
        this.props.ramp_callback({ ramp, interpolations })
        const colors = stat_vals.map(
            val => interpolate_color(ramp, val),
        )
        const styles = colors.map(
            // no outline, set color fill, alpha=1
            color => ({
                fillColor: color,
                fillOpacity: 1,
                color: line_style.color,
                opacity: 1,
                weight: line_style.weight,
            }),
        )
        const metas = stat_vals.map((x) => { return { statistic: x } })
        return [names, styles, metas, -1] as const
    }

    override mapDidRender(): Promise<void> {
    // zoom map to fit united states
    // do so instantly
        this.map!.fitBounds([
            [49.3457868, -124.7844079],
            [24.7433195, -66.9513812],
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

    const create_value = (stat: number): ReactNode => {
        return (
            <div className="centered_text">
                <Statistic
                    statname={props.name}
                    value={stat}
                    is_unit={false}
                />
                <Statistic
                    statname={props.name}
                    value={stat}
                    is_unit={true}
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
                                            backgroundColor: interpolate_color(props.ramp!.ramp, x),
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
                                    {create_value(x)}
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
    underlying_shapes: Promise<ConsolidatedShapes>
    underlying_stats: Promise<ConsolidatedStatistics>
    geography_kind: string
    ramp: Ramp
    color_stat: ColorStatDescriptor | undefined
    filter: FilterSettings
    map_ref: React.RefObject<DisplayedMap>
    line_style: LineStyle
    basemap: Basemap
    height: string | undefined
}

interface EmpiricalRamp {
    ramp: Keypoints
    interpolations: number[]
}

function MapComponent(props: MapComponentProps): ReactNode {
    const color_stat = parse_color_stat(name_to_index, props.color_stat)
    const filter = props.filter.enabled ? parse_color_stat(name_to_index, props.filter.function) : undefined

    const [empirical_ramp, set_empirical_ramp] = useState<EmpiricalRamp | undefined>(undefined)

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: props.height,
        }}
        >
            <div style={{ height: '90%', width: '100%' }}>
                <DisplayedMap
                    color_stat={color_stat}
                    filter={filter}
                    geography_kind={props.geography_kind}
                    underlying_shapes={props.underlying_shapes}
                    underlying_stats={props.underlying_stats}
                    ramp={props.ramp}
                    ramp_callback={(newRamp) => { set_empirical_ramp(newRamp) }}
                    ref={props.map_ref}
                    line_style={props.line_style}
                    basemap={props.basemap}
                    height={props.height}
                />
            </div>
            <div style={{ height: '8%', width: '100%' }}>
                <Colorbar
                    name={color_stat.name()}
                    ramp={empirical_ramp}
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

function Export(props: { map_ref: React.RefObject<DisplayedMap> }): ReactNode {
    const exportAsSvg = async (): Promise<void> => {
        if (props.map_ref.current === null) {
            return
        }
        const svg = await props.map_ref.current.exportAsSvg()
        saveAsFile('map.svg', svg, 'image/svg+xml')
    }

    const exportAsGeoJSON = async (): Promise<void> => {
        if (props.map_ref.current === null) {
            return
        }
        const geojson = await props.map_ref.current.exportAsGeoJSON()
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

function mapSettingsFromURLParams(): MapSettings {
    const params = new URLSearchParams(window.location.search)
    const encoded_settings = params.get('settings')
    let settings: Partial<MapSettings> = {}
    if (encoded_settings !== null) {
        const jsoned_settings = gunzipSync(Buffer.from(encoded_settings, 'base64')).toString()
        settings = JSON.parse(jsoned_settings) as Partial<MapSettings>
    }
    return default_settings(settings)
}

const name_to_index = new Map(statNames.map((name, i) => [name, i]))

export function MapperPanel(): ReactNode {
    const [map_settings, set_map_settings] = useState(mapSettingsFromURLParams())

    const [underlying_shapes, set_underlying_shapes] = useState<Promise<ConsolidatedShapes> | undefined>(undefined)
    const [underlying_stats, set_underlying_stats] = useState<Promise<ConsolidatedStatistics> | undefined>(undefined)

    useEffect(() => {
        if ((valid_geographies as readonly string[]).includes(map_settings.geography_kind)) {
            set_underlying_shapes(loadProtobuf(
                consolidated_shape_link(map_settings.geography_kind),
                'ConsolidatedShapes',
            ))
            set_underlying_stats(loadProtobuf(
                consolidated_stats_link(map_settings.geography_kind),
                'ConsolidatedStatistics',
            ))
        }
    }, [map_settings.geography_kind])

    const map_ref = useRef<DisplayedMap>(null)

    const jsoned_settings = JSON.stringify(map_settings)

    useEffect(() => {
    // gzip then base64 encode
        const encoded_settings = gzipSync(jsoned_settings).toString('base64')
        // convert to parameters like ?settings=...
        const params = new URLSearchParams(window.location.search)
        params.set('settings', encoded_settings)
        // back button should work
        window.history.pushState(null, '', `?${params.toString()}`)
    }, [jsoned_settings])

    useEffect(() => {
        const listener = (): void => { set_map_settings(mapSettingsFromURLParams()) }
        window.addEventListener('popstate', listener)
        return () => { window.removeEventListener('popstate', listener) }
    }, [])

    const mapper_panel = (height: string | undefined): ReactNode => {
        const ramp = parse_ramp(map_settings.ramp)
        const geography_kind = map_settings.geography_kind
        const color_stat = map_settings.color_stat
        const filter = map_settings.filter
        const valid = (valid_geographies as readonly string[]).includes(geography_kind)

        return !valid
            ? <div>Invalid geography kind</div>
            : (
                    <MapComponent
                        underlying_shapes={underlying_shapes!}
                        underlying_stats={underlying_stats!}
                        geography_kind={geography_kind}
                        ramp={ramp}
                        color_stat={color_stat}
                        filter={filter}
                        map_ref={map_ref}
                        line_style={map_settings.line_style}
                        basemap={map_settings.basemap}
                        height={height}
                    />
                )
    }

    const headerTextClass = useHeaderTextClass()

    if (new URLSearchParams(window.location.search).get('view') === 'true') {
        return mapper_panel('100%')
    }

    return (
        <PageTemplate>
            <div>
                <div className={headerTextClass}>Urban Stats Mapper (beta)</div>
                <MapperSettings
                    names={statNames}
                    valid_geographies={valid_geographies as readonly string[]}
                    map_settings={map_settings}
                    set_map_settings={set_map_settings}
                />
                <Export
                    map_ref={map_ref}
                />
                {
                    mapper_panel(undefined) // use default height
                }
            </div>
        </PageTemplate>
    )
}
