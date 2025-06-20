import '../common.css'
import './article.css'

import { gzipSync } from 'zlib'

import React, { ReactNode, useContext, useEffect, useRef, useState } from 'react'

import valid_geographies from '../data/mapper/used_geographies'
import { loadProtobuf } from '../load_json'
import { Keypoints } from '../mapper/ramps'
import { MapSettings, MapperSettings } from '../mapper/settings'
import { Navigator } from '../navigation/Navigator'
import { consolidatedShapeLink } from '../navigation/links'
import { PageTemplate } from '../page_template/template'
import { instantiate, ScaleInstance } from '../urban-stats-script/constants/scale'
import { parse } from '../urban-stats-script/parser'
import { executeAsync } from '../urban-stats-script/workerManager'
import { interpolateColor } from '../utils/color'
import { ConsolidatedShapes, Feature } from '../utils/protos'
import { useHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { MapGeneric, MapGenericProps, Polygons } from './map'
import { Statistic } from './table'

interface DisplayedMapProps extends MapGenericProps {
    geographyKind: string
    underlyingShapes: Promise<ConsolidatedShapes>
    rampCallback: (newRamp: EmpiricalRamp) => void
    height: number | string | undefined
    uss: string
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

        const stmts = parse(this.props.uss)
        if (stmts.type === 'error') {
            console.error('Error parsing USS expression:', stmts.errors)
            return { polygons: [], zoomIndex: -1 }
        }
        const result = await executeAsync({ descriptor: { kind: 'mapper', geographyKind: this.props.geographyKind }, stmts })
        if (!result.success) {
            console.error('Error executing USS expression:', result.error)
            return { polygons: [], zoomIndex: -1 }
        }

        const cMap = result.value.value.value
        // TODO
        const lineStyle = {
            color: '#000000',
            weight: 0,
        }

        const names = cMap.geo
        const ramp = cMap.ramp
        const scale = instantiate(cMap.scale)
        const interpolations = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(scale.inverse)
        this.props.rampCallback({ ramp, interpolations, scale })
        const colors = cMap.data.map(
            val => interpolateColor(ramp, scale.forward(val)),
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
        const metas = cMap.data.map((x) => { return { statistic: x } })
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
                                            backgroundColor: interpolateColor(props.ramp!.ramp, props.ramp!.scale.forward(x)),
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
    geographyKind: string
    mapRef: React.RefObject<DisplayedMap>
    height: number | string | undefined
    uss: string
}

interface EmpiricalRamp {
    ramp: Keypoints
    scale: ScaleInstance
    interpolations: number[]
}

function MapComponent(props: MapComponentProps): ReactNode {
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
                    geographyKind={props.geographyKind}
                    underlyingShapes={props.underlyingShapes}
                    rampCallback={(newRamp) => { setEmpiricalRamp(newRamp) }}
                    ref={props.mapRef}
                    uss={props.uss}
                    height={props.height}
                    attribution="startVisible"
                    basemap={{ type: 'osm' }} // TODO
                />
            </div>
            <div style={{ height: '8%', width: '100%' }}>
                <Colorbar
                    name="TODO Placeholder"
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

export function MapperPanel(props: { mapSettings: MapSettings, view: boolean }): ReactNode {
    const [mapSettings, setMapSettings] = useState(props.mapSettings)

    useEffect(() => {
        // So that map settings are updated when the prop changes
        setMapSettings(props.mapSettings)
    }, [props.mapSettings])

    const [underlyingShapes, setUnderlyingShapes] = useState<Promise<ConsolidatedShapes> | undefined>(undefined)

    useEffect(() => {
        if (valid_geographies.includes(mapSettings.geography_kind)) {
            setUnderlyingShapes(loadProtobuf(
                consolidatedShapeLink(mapSettings.geography_kind),
                'ConsolidatedShapes',
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
        const geographyKind = mapSettings.geography_kind

        return (underlyingShapes === undefined)
            ? <div>Invalid geography kind</div>
            : (
                    <MapComponent
                        underlyingShapes={underlyingShapes}
                        geographyKind={geographyKind}
                        uss={mapSettings.uss}
                        height={height}
                        mapRef={mapRef}
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
