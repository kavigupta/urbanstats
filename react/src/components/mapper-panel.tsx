import '../common.css'
import './article.css'

import { gzipSync } from 'zlib'

import React, { ReactNode, useContext, useEffect, useRef, useState } from 'react'

import valid_geographies from '../data/mapper/used_geographies'
import universes_ordered from '../data/universes_ordered'
import { loadProtobuf } from '../load_json'
import { Keypoints } from '../mapper/ramps'
import { MapperSettings } from '../mapper/settings/MapperSettings'
import { MapSettings, computeUSS, Basemap } from '../mapper/settings/utils'
import { Navigator } from '../navigation/Navigator'
import { consolidatedShapeLink, indexLink } from '../navigation/links'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { loadCentroids } from '../syau/load'
import { Universe } from '../universe'
import { getAllParseErrors, UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { doRender } from '../urban-stats-script/constants/color'
import { instantiate, ScaleInstance } from '../urban-stats-script/constants/scale'
import { EditorError } from '../urban-stats-script/editor-utils'
import { loadInset } from '../urban-stats-script/worker'
import { executeAsync } from '../urban-stats-script/workerManager'
import { interpolateColor } from '../utils/color'
import { computeAspectRatioForInsets } from '../utils/coordinates'
import { assert } from '../utils/defensive'
import { ConsolidatedShapes, Feature, IFeature } from '../utils/protos'
import { useHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'
import { UnitType } from '../utils/unit'

import { Insets, ShapeRenderingSpec, MapGeneric, MapGenericProps, MapHeight, ShapeType, ShapeSpec } from './map'
import { Statistic } from './table'

interface DisplayedMapProps extends MapGenericProps {
    geographyKind: typeof valid_geographies[number]
    universe: Universe
    rampCallback: (newRamp: EmpiricalRamp) => void
    basemapCallback: (basemap: Basemap) => void
    insetsCallback: (insetsToUse: Insets) => void
    height: MapHeight | undefined
    uss: UrbanStatsASTStatement | undefined
    setErrors: (errors: EditorError[]) => void
    colors: Colors
}

interface ShapesForUniverse {
    shapes: { type: 'polygon', value: NormalizeProto<IFeature>[] } | { type: 'point', value: { lon: number, lat: number }[] }
    nameToIndex: Map<string, number>
}

type ActualShapeType = { type: 'polygon', value: NormalizeProto<Feature> } | { type: 'point', value: { lon: number, lat: number } }

async function loadPolygons(geographyKind: typeof valid_geographies[number], universe: string): Promise<ShapesForUniverse> {
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
    return { shapes: { type: 'polygon', value: features }, nameToIndex: new Map(longnames.map((r, i) => [r, i])) }
}

async function loadShapes(geographyKind: typeof valid_geographies[number], universe: string, shapeType: ShapeType): Promise<ShapesForUniverse> {
    switch (shapeType) {
        case 'polygon':
            return loadPolygons(geographyKind, universe)
        case 'point':
            const idxLink = indexLink(universe, geographyKind)
            const articles = await loadProtobuf(idxLink, 'ArticleOrderingList')
            const centroids = await loadCentroids(universe, geographyKind, articles.longnames)

            return {
                shapes: { type: 'point', value: centroids.map(c => ({ lon: c.lon!, lat: c.lat! })) },
                nameToIndex: new Map(articles.longnames.map((r, i) => [r, i])),
            }
        default:
            throw new Error(`Unknown shape type ${shapeType}`)
    }
}

interface Shapes { geographyKind: string, universe: string, shapeType: string, data: Promise<ShapesForUniverse> }

class DisplayedMap extends MapGeneric<DisplayedMapProps> {
    private shapes: undefined | Shapes
    private shapeType: undefined | ShapeType

    private getShapes(): Shapes {
        if (this.shapes && this.shapes.geographyKind === this.props.geographyKind && this.shapes.universe === this.props.universe && this.shapes.shapeType === this.shapeType) {
            return this.shapes
        }

        const st = this.shapeType
        assert(st !== undefined, 'Shape type must be set before loading shapes')

        this.shapes = {
            geographyKind: this.props.geographyKind, universe: this.props.universe, shapeType: st, data: (async () => {
                return loadShapes(this.props.geographyKind, this.props.universe, st)
            })() }

        return this.shapes
    }

    async loadShapes(name: string): Promise<ActualShapeType> {
        const { nameToIndex, shapes } = await this.getShapes().data
        const index = nameToIndex.get(name)
        assert(index !== undefined && index >= 0 && index < shapes.value.length, `Shape ${name} not found in ${this.getShapes().geographyKind} for ${this.getShapes().universe}`)
        switch (shapes.type) {
            case 'polygon':
                return { type: 'polygon', value: shapes.value[index] as NormalizeProto<Feature> }
            case 'point':
                return { type: 'point', value: shapes.value[index] }
        }
    }

    override async loadPolygon(name: string): Promise<NormalizeProto<Feature>> {
        const res = await this.loadShapes(name)
        assert(res.type === 'polygon', `Shape ${name} is not a polygon`)
        return res.value
    }

    override async loadPoint(name: string): Promise<{ lon: number, lat: number }> {
        const res = await this.loadShapes(name)
        assert(res.type === 'point', `Shape ${name} is not a point`)
        return res.value
    }

    override async computeShapesToRender(version: number): Promise<ShapeRenderingSpec> {
        const stmts = this.props.uss
        if (stmts === undefined) {
            return { shapes: [], zoomIndex: -1 }
        }
        const result = await executeAsync({ descriptor: { kind: 'mapper', geographyKind: this.props.geographyKind, universe: this.props.universe }, stmts })
        if (version === this.version) {
            this.props.setErrors(result.error)
        }
        if (result.resultingValue === undefined) {
            return { shapes: [], zoomIndex: -1 }
        }
        const mapResultMain = result.resultingValue.value
        const mapResult = mapResultMain.value
        const st: ShapeType = mapResultMain.opaqueType === 'pMap' ? 'point' : 'polygon'
        this.shapeType = st

        // Handle different map types
        let lineStyle: { color: { r: number, g: number, b: number, a: number }, weight: number } | undefined
        let pointSizes: number[] | undefined

        if (mapResultMain.opaqueType === 'cMap') {
            // For choropleth maps, use the outline
            lineStyle = mapResultMain.value.outline
        }
        else {
            const maxRadius = mapResultMain.value.maxRadius
            const relativeArea = mapResultMain.value.relativeArea
            pointSizes = relativeArea.map(area => Math.sqrt(area) * maxRadius)
        }

        const names = mapResult.geo
        const ramp = mapResult.ramp
        const scale = instantiate(mapResult.scale)
        const interpolations = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(scale.inverse)
        this.props.rampCallback({ ramp, interpolations, scale, label: mapResult.label, unit: mapResult.unit })
        this.props.basemapCallback(mapResult.basemap)
        this.props.insetsCallback(mapResult.insets)
        const colors = mapResult.data.map(
            val => interpolateColor(ramp, scale.forward(val), this.props.colors.mapInvalidFillColor),
        )
        const specs = colors.map(
            // no outline, set color fill, alpha=1
            (color, i): ShapeSpec => {
                switch (st) {
                    case 'polygon':
                        return {
                            type: 'polygon',
                            style: {
                                fillColor: color,
                                fillOpacity: 1,
                                color: doRender(lineStyle!.color),
                                weight: lineStyle!.weight,
                            },
                        }
                    case 'point':
                        return {
                            type: 'point',
                            style: {
                                fillColor: color,
                                fillOpacity: 1,
                                radius: pointSizes![i],
                            },
                        }
                }
            },
        )
        const metas = mapResult.data.map((x) => { return { statistic: x } })
        return {
            shapes: names.map((name, i) => ({
                name,
                spec: specs[i],
                meta: metas[i],
            })),
            zoomIndex: -1,
        }
    }

    override progressivelyLoadShapes(): boolean {
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
    colorbarRef: React.RefObject<HTMLDivElement>
}

interface EmpiricalRamp {
    ramp: Keypoints
    scale: ScaleInstance
    interpolations: number[]
    label: string
    unit?: UnitType
}

function MapComponent(props: MapComponentProps): ReactNode {
    const [empiricalRamp, setEmpiricalRamp] = useState<EmpiricalRamp | undefined>(undefined)
    const [basemap, setBasemap] = useState<Basemap>({ type: 'osm' })

    const [currentInsets, setCurrentInsets] = useState<Insets>(loadInset(props.universe))

    const aspectRatio = computeAspectRatioForInsets(currentInsets)

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
                    insetsCallback={(newInsets) => { setCurrentInsets(newInsets) }}
                    ref={props.mapRef}
                    uss={props.uss}
                    height={{ type: 'aspect-ratio', value: aspectRatio }}
                    attribution="startVisible"
                    basemap={basemap}
                    setErrors={props.setErrors}
                    colors={useColors()}
                    insets={currentInsets}
                    key={JSON.stringify(currentInsets)}
                />
            </div>
            <div style={{ height: '8%', width: '100%' }} ref={props.colorbarRef}>
                <Colorbar
                    ramp={empiricalRamp}
                />
            </div>
        </div>
    )
}

function saveAsFile(filename: string, data: string | Blob, type: string): void {
    const blob = typeof data === 'string' ? new Blob([data], { type }) : data
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

function Export(props: { mapRef: React.RefObject<DisplayedMap>, colorbarRef: React.RefObject<HTMLDivElement> }): ReactNode {
    const colors = useColors()

    const exportAsPng = async (): Promise<void> => {
        if (props.mapRef.current === null) {
            return
        }
        const colorbarElement = props.colorbarRef.current ?? undefined
        const pngDataUrl = await props.mapRef.current.exportAsPng(colorbarElement, colors.background, colors.mapInsetBorderColor)
        const data = await fetch(pngDataUrl)
        const pngData = await data.blob()
        saveAsFile('map.png', pngData, 'image/png')
    }

    const exportAsGeoJSON = async (): Promise<void> => {
        if (props.mapRef.current === null) {
            return
        }
        const geojson = await props.mapRef.current.exportAsGeoJSON()
        saveAsFile('map.geojson', geojson, 'application/geo+json')
    }

    return (
        <div style={{
            display: 'flex',
            gap: '0.5em',
            margin: '0.5em 0',
        }}
        >
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

export function MapperPanel(props: { mapSettings: MapSettings, view: boolean }): ReactNode {
    const [mapSettings, setMapSettings] = useState(props.mapSettings)
    const [uss, setUSS] = useState<UrbanStatsASTStatement | undefined>(undefined)

    const setMapSettingsWrapper = (newSettings: MapSettings): void => {
        setMapSettings(newSettings)
        const result = computeUSS(newSettings.script)
        const errors = getAllParseErrors(result)
        if (errors.length > 0) {
            setErrors(errors.map(e => ({ ...e, kind: 'error' })))
        }
        setUSS(errors.length > 0 ? undefined : result)
    }

    useEffect(() => {
        // So that map settings are updated when the prop changes
        setMapSettingsWrapper(props.mapSettings)
    }, [props.mapSettings])

    const mapRef = useRef<DisplayedMap>(null)
    const colorbarRef = useRef<HTMLDivElement>(null)

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

    console.warn('MapperPanel errors', errors)

    const mapperPanel = (): ReactNode => {
        const geographyKind = mapSettings.geographyKind
        return (!valid_geographies.includes(geographyKind))
            ? <div>Invalid geography kind</div>
            : (
                    <MapComponent
                        geographyKind={geographyKind}
                        universe={mapSettings.universe}
                        uss={uss}
                        mapRef={mapRef}
                        setErrors={setErrors}
                        colorbarRef={colorbarRef}
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
                    mapSettings={mapSettings}
                    setMapSettings={(setter) => {
                        setMapSettingsWrapper(setter(mapSettings))
                    }}
                    errors={errors}
                />
                <Export
                    mapRef={mapRef}
                    colorbarRef={colorbarRef}
                />
                {
                    mapperPanel()
                }
            </div>
        </PageTemplate>
    )
}
