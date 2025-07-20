import '../common.css'
import './article.css'

import { gzipSync } from 'zlib'

import maplibregl from 'maplibre-gl'
import React, { ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'

import insets from '../data/insets'
import valid_geographies from '../data/mapper/used_geographies'
import universes_ordered from '../data/universes_ordered'
import { loadProtobuf } from '../load_json'
import { Keypoints } from '../mapper/ramps'
import { MapperSettings } from '../mapper/settings/MapperSettings'
import { MapSettings, computeUSS, Basemap, Universe } from '../mapper/settings/utils'
import { Navigator } from '../navigation/Navigator'
import { consolidatedShapeLink } from '../navigation/links'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { getAllParseErrors, UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { doRender } from '../urban-stats-script/constants/color'
import { instantiate, ScaleInstance } from '../urban-stats-script/constants/scale'
import { EditorError } from '../urban-stats-script/editor-utils'
import { executeAsync } from '../urban-stats-script/workerManager'
import { interpolateColor } from '../utils/color'
import { assert } from '../utils/defensive'
import { ConsolidatedShapes, Feature, IFeature } from '../utils/protos'
import { useHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'
import { UnitType } from '../utils/unit'

import type { Inset, Insets } from './map'
import { MapGeneric, MapGenericProps, Polygons, MapHeight } from './map'
import { Statistic } from './table'

interface DisplayedMapProps extends MapGenericProps {
    geographyKind: typeof valid_geographies[number]
    universe: string
    rampCallback: (newRamp: EmpiricalRamp) => void
    basemapCallback: (basemap: Basemap) => void
    height: MapHeight | undefined
    uss: UrbanStatsASTStatement | undefined
    setErrors: (errors: EditorError[]) => void
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
        const stmts = this.props.uss
        if (stmts === undefined) {
            return { polygons: [], zoomIndex: -1 }
        }
        const result = await executeAsync({ descriptor: { kind: 'mapper', geographyKind: this.props.geographyKind, universe: this.props.universe }, stmts })
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
        this.props.rampCallback({ ramp, interpolations, scale, label: cMap.label, unit: cMap.unit })
        this.props.basemapCallback(cMap.basemap)
        const colors = cMap.data.map(
            val => interpolateColor(ramp, scale.forward(val), this.props.colors.mapInvalidFillColor),
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

    override progressivelyLoadPolygons(): boolean {
        return false
    }
}

function Colorbar(props: { ramp: EmpiricalRamp | undefined }): ReactNode {
    // do this as a table with 10 columns, each 10% wide and
    // 2 rows. Top one is the colorbar, bottom one is the
    // labels.
    const colors = useColors()
    if (props.ramp === undefined) {
        return <div></div>
    }
    const label = props.ramp.label
    const values = props.ramp.interpolations
    const unit = props.ramp.unit

    const createValue = (stat: number): ReactNode => {
        return (
            <div className="centered_text">
                <Statistic
                    statname={label}
                    value={stat}
                    isUnit={false}
                    unit={unit}
                />
                <Statistic
                    statname={label}
                    value={stat}
                    isUnit={true}
                    unit={unit}
                />
            </div>
        )
    }

    const width = `${100 / values.length}%`

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
                                            width, height: '1em',
                                            backgroundColor: interpolateColor(props.ramp!.ramp, props.ramp!.scale.forward(x), colors.mapInvalidFillColor),
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
                                <td key={i} style={{ width, height: '1em' }}>
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
    universe: Universe
    mapRef: React.RefObject<DisplayedMap>
    uss: UrbanStatsASTStatement | undefined
    setErrors: (errors: EditorError[]) => void
}

interface EmpiricalRamp {
    ramp: Keypoints
    scale: ScaleInstance
    interpolations: number[]
    label: string
    unit?: UnitType
}

// Web Mercator projection functions
function lngToWebMercatorX(lng: number): number {
    return lng * Math.PI / 180 * 6378137
}

function latToWebMercatorY(lat: number): number {
    return 6378137 * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))
}

function computeAspectRatio(coordBox: readonly [number, number, number, number]): number {
    const [minLng, minLat, maxLng, maxLat] = coordBox

    const x1 = lngToWebMercatorX(minLng)
    const x2 = lngToWebMercatorX(maxLng)
    const y1 = latToWebMercatorY(minLat)
    const y2 = latToWebMercatorY(maxLat)

    const width = Math.abs(x2 - x1)
    const height = Math.abs(y2 - y1)

    return width / height
}

function loadInset(universe: Universe): [Insets | undefined, number] {
    const insetsU = insets[universe]
    assert(insetsU.length > 0, `No insets for universe ${universe}`)
    assert(insetsU[0].mainMap, `No main map for universe ${universe}`)
    const aspectRatio = computeAspectRatio(insetsU[0].coordBox)
    console.log('aspect ratio', aspectRatio)
    const insetsProc = insetsU.map((inset) => {
        return {
            bottomLeft: [inset.bottomLeft[0], inset.bottomLeft[1]],
            topRight: [inset.topRight[0], inset.topRight[1]],
            coordBox: new maplibregl.LngLatBounds(
                [inset.coordBox[0], inset.coordBox[1]],
                [inset.coordBox[2], inset.coordBox[3]],
            ),
            mainMap: inset.mainMap,
        } satisfies Inset
    })
    return [insetsProc, aspectRatio]
}

function MapComponent(props: MapComponentProps): ReactNode {
    const [empiricalRamp, setEmpiricalRamp] = useState<EmpiricalRamp | undefined>(undefined)
    const [basemap, setBasemap] = useState<Basemap>({ type: 'osm' })

    const [insetsU, aspectRatio] = loadInset(props.universe)

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
        }}
        >
            <div style={{ height: '90%', width: '100%' }}>
                <DisplayedMap
                    geographyKind={props.geographyKind}
                    universe={props.universe}
                    rampCallback={(newRamp) => { setEmpiricalRamp(newRamp) }}
                    basemapCallback={(newBasemap) => { setBasemap(newBasemap) }}
                    ref={props.mapRef}
                    uss={props.uss}
                    height={{ type: 'aspect-ratio', value: aspectRatio }}
                    attribution="startVisible"
                    basemap={basemap}
                    setErrors={props.setErrors}
                    colors={useColors()}
                    insets={insetsU ?? undefined}
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

    const mapperPanel = (): ReactNode => {
        const geographyKind = mapSettings.geographyKind as typeof valid_geographies[number]
        return (!valid_geographies.includes(geographyKind))
            ? <div>Invalid geography kind</div>
            : (
                    <MapComponent
                        geographyKind={geographyKind}
                        universe={mapSettings.universe}
                        uss={uss}
                        mapRef={mapRef}
                        setErrors={setErrors}
                    />
                )
    }

    const headerTextClass = useHeaderTextClass()

    const getScript = useCallback(() => mapSettings.script, [mapSettings.script])

    if (props.view) {
        return mapperPanel()
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
                    mapperPanel()
                }
            </div>
        </PageTemplate>
    )
}
