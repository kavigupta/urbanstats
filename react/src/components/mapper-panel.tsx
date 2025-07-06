import '../common.css'
import './article.css'

import { gzipSync } from 'zlib'

import React, { ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'

import valid_geographies from '../data/mapper/used_geographies'
import { loadProtobuf } from '../load_json'
import { Keypoints } from '../mapper/ramps'
import { MapperSettings } from '../mapper/settings/MapperSettings'
import { MapSettings, computeUSS } from '../mapper/settings/utils'
import { Navigator } from '../navigation/Navigator'
import { consolidatedShapeLink, consolidatedStatsLink } from '../navigation/links'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { getAllParseErrors, UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { doRender } from '../urban-stats-script/constants/color'
import { instantiate, ScaleInstance } from '../urban-stats-script/constants/scale'
import { EditorError } from '../urban-stats-script/editor-utils'
import { toSExp } from '../urban-stats-script/parser'
import { executeAsync } from '../urban-stats-script/workerManager'
import { interpolateColor } from '../utils/color'
import { ConsolidatedShapes, Feature, IConsolidatedShapes } from '../utils/protos'
import { useHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { MapGeneric, MapGenericProps, Polygons } from './map'
import { Statistic } from './table'

interface DisplayedMapProps extends MapGenericProps {
    geographyKind: typeof valid_geographies[number]
    rampCallback: (newRamp: EmpiricalRamp) => void
    height: number | string | undefined
    uss: UrbanStatsASTStatement | undefined
    setErrors: (errors: EditorError[]) => void
    colors: Colors
}

interface Shapes { geographyKind: string, data: Promise<{ shapes: NormalizeProto<IConsolidatedShapes>, nameToIndex: Map<string, number> }> }

class DisplayedMap extends MapGeneric<DisplayedMapProps> {
    private shapes: undefined | Shapes

    private getShapes(): Shapes {
        if (this.shapes?.geographyKind === this.props.geographyKind) {
            return this.shapes
        }

        this.shapes = { geographyKind: this.props.geographyKind, data: (async () => {
            const shapes = (await loadProtobuf(
                consolidatedShapeLink(this.props.geographyKind),
                'ConsolidatedShapes',
            )) as NormalizeProto<ConsolidatedShapes>

            const nameToIndex = new Map(shapes.longnames.map((r, i) => [r, i]))
            return { shapes, nameToIndex }
        })() }

        return this.shapes
    }

    override async loadShape(name: string): Promise<NormalizeProto<Feature>> {
        const { nameToIndex, shapes } = await this.getShapes().data
        const index = nameToIndex.get(name)!
        const data = shapes.shapes[index]
        return data as NormalizeProto<Feature>
    }

    override async computePolygons(): Promise<Polygons> {
        const stmts = this.props.uss
        if (stmts === undefined) {
            return { polygons: [], zoomIndex: -1 }
        }
        console.log('statements', toSExp(stmts))
        console.log('statements', stmts)
        const result = await executeAsync({ descriptor: { kind: 'mapper', geographyKind: this.props.geographyKind }, stmts })
        console.log('result', result)
        if (!result.success) {
            this.props.setErrors([result.error])
            return { polygons: [], zoomIndex: -1 }
        }

        this.props.setErrors([])

        const cMap = result.value.value.value
        // Use the outline from cMap instead of hardcoded lineStyle
        const lineStyle = cMap.outline

        const names = cMap.geo
        const ramp = cMap.ramp
        const scale = instantiate(cMap.scale)
        const interpolations = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(scale.inverse)
        this.props.rampCallback({ ramp, interpolations, scale, label: cMap.label })
        const colors = cMap.data.map(
            val => interpolateColor(ramp, scale.forward(val)),
        )
        const styles = colors.map(
            // use outline color from cMap, convert Color object to hex string
            color => ({
                fillColor: color,
                fillOpacity: 1,
                color: doRender(lineStyle.color),
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

function Colorbar(props: { ramp: EmpiricalRamp | undefined }): ReactNode {
    // do this as a table with 10 columns, each 10% wide and
    // 2 rows. Top one is the colorbar, bottom one is the
    // labels.
    if (props.ramp === undefined) {
        return <div></div>
    }
    const label = props.ramp.label
    const values = props.ramp.interpolations

    const createValue = (stat: number): ReactNode => {
        return (
            <div className="centered_text">
                <Statistic
                    statname={label}
                    value={stat}
                    isUnit={false}
                />
                <Statistic
                    statname={label}
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
                {label}
            </div>
        </div>
    )
}

interface MapComponentProps {
    geographyKind: typeof valid_geographies[number]
    mapRef: React.RefObject<DisplayedMap>
    height: number | string | undefined
    uss: UrbanStatsASTStatement | undefined
    setErrors: (errors: EditorError[]) => void
}

interface EmpiricalRamp {
    ramp: Keypoints
    scale: ScaleInstance
    interpolations: number[]
    label: string
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
                    rampCallback={(newRamp) => { setEmpiricalRamp(newRamp) }}
                    ref={props.mapRef}
                    uss={props.uss}
                    height={props.height}
                    attribution="startVisible"
                    basemap={{ type: 'osm' }} // TODO
                    setErrors={props.setErrors}
                    colors={useColors()}
                />
            </div>
            <div style={{ height: '8%', width: '100%' }}>
                <Colorbar
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
    const [uss, setUSS] = useState<UrbanStatsASTStatement | undefined>(undefined)

    const setMapSettingsWrapper = (newSettings: MapSettings): void => {
        setMapSettings(newSettings)
        const result = computeUSS(newSettings.script)
        const errors = getAllParseErrors(result)
        if (errors.length > 0) {
            setErrors(errors)
        }
        setUSS(errors.length > 0 ? undefined : result)
    }

    useEffect(() => {
        // So that map settings are updated when the prop changes
        setMapSettingsWrapper(props.mapSettings)
    }, [props.mapSettings])

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

    const [errors, setErrors] = useState<EditorError[]>([])

    const mapperPanel = (height: string | undefined): ReactNode => {
        const geographyKind = mapSettings.geographyKind as typeof valid_geographies[number]
        return (!valid_geographies.includes(geographyKind))
            ? <div>Invalid geography kind</div>
            : (
                    <MapComponent
                        geographyKind={geographyKind}
                        uss={uss}
                        height={height}
                        mapRef={mapRef}
                        setErrors={setErrors}
                    />
                )
    }

    const headerTextClass = useHeaderTextClass()

    const getScript = useCallback(() => mapSettings.script, [mapSettings.script])

    if (props.view) {
        return mapperPanel('100%')
    }

    return (
        <PageTemplate>
            <div>
                <div className={headerTextClass}>Urban Stats Mapper (beta)</div>
                <MapperSettings
                    getScript={getScript}
                    mapSettings={mapSettings}
                    setMapSettings={(setter) => {
                        setMapSettingsWrapper(setter(mapSettings))
                    }}
                    errors={errors}
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
