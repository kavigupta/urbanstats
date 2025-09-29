import '../common.css'
import './article.css'

import { gzipSync } from 'zlib'

import stableStringify from 'json-stable-stringify'
import React, { ReactNode, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import valid_geographies from '../data/mapper/used_geographies'
import universes_ordered from '../data/universes_ordered'
import { loadProtobuf } from '../load_json'
import { Keypoints } from '../mapper/ramps'
import { ImportExportCode } from '../mapper/settings/ImportExportCode'
import { MapperSettings } from '../mapper/settings/MapperSettings'
import { MapUSS } from '../mapper/settings/TopLevelEditor'
import { MapSettings, computeUSS, Basemap } from '../mapper/settings/utils'
import { Navigator } from '../navigation/Navigator'
import { consolidatedShapeLink, indexLink } from '../navigation/links'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { loadCentroids } from '../syau/load'
import { Universe } from '../universe'
import { DisplayResults } from '../urban-stats-script/Editor'
import { getAllParseErrors, UrbanStatsASTExpression, UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { doRender } from '../urban-stats-script/constants/color'
import { instantiate, ScaleInstance } from '../urban-stats-script/constants/scale'
import { EditorError } from '../urban-stats-script/editor-utils'
import { noLocation } from '../urban-stats-script/location'
import { hasCustomNode, unparse } from '../urban-stats-script/parser'
import { loadInset, loadInsetExpression } from '../urban-stats-script/worker'
import { executeAsync } from '../urban-stats-script/workerManager'
import { furthestColor, interpolateColor } from '../utils/color'
import { computeAspectRatioForInsets } from '../utils/coordinates'
import { assert } from '../utils/defensive'
import { ConsolidatedShapes, Feature, IFeature } from '../utils/protos'
import { onWidthChange, useHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'
import { UnitType } from '../utils/unit'

import { CountsByUT } from './countsByArticleType'
import { Insets, ShapeRenderingSpec, MapGeneric, MapGenericProps, MapHeight, ShapeType, ShapeSpec, EditMultipleInsets } from './map'
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

    override shouldHaveLoadingSpinner(): boolean {
        return true
    }

    private getShapes(): Shapes {
        if (this.shapes && this.shapes.geographyKind === this.versionProps.geographyKind && this.shapes.universe === this.versionProps.universe && this.shapes.shapeType === this.shapeType) {
            return this.shapes
        }

        const st = this.shapeType
        assert(st !== undefined, 'Shape type must be set before loading shapes')

        this.shapes = {
            geographyKind: this.versionProps.geographyKind, universe: this.versionProps.universe, shapeType: st, data: (async () => {
                return loadShapes(this.versionProps.geographyKind, this.versionProps.universe, st)
            })() }

        return this.shapes
    }

    async loadShapes(name: string): Promise<ActualShapeType> {
        const mapShapes = this.getShapes()
        const { nameToIndex, shapes } = await mapShapes.data
        const index = nameToIndex.get(name)
        assert(index !== undefined && index >= 0 && index < shapes.value.length, `Shape ${name} not found in ${mapShapes.geographyKind} for ${mapShapes.universe}`)
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
        const stmts = this.versionProps.uss
        if (stmts === undefined) {
            return { shapes: [], zoomIndex: -1 }
        }
        const result = await executeAsync({ descriptor: { kind: 'mapper', geographyKind: this.versionProps.geographyKind, universe: this.versionProps.universe }, stmts })
        if (version === this.version) {
            this.versionProps.setErrors(result.error)
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
        this.versionProps.rampCallback({ ramp, interpolations, scale, label: mapResult.label, unit: mapResult.unit })
        this.versionProps.basemapCallback(mapResult.basemap)
        this.versionProps.insetsCallback(mapResult.insets)
        const furthest = furthestColor(ramp.map(x => x[1]))
        const colors = mapResult.data.map(
            val => interpolateColor(ramp, scale.forward(val), furthest),
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

function colorbarStyleFromBasemap(basemap: Basemap): React.CSSProperties {
    switch (basemap.type) {
        case 'osm':
            return { }
        case 'none':
            return { backgroundColor: basemap.backgroundColor, color: basemap.textColor }
    }
}

function Colorbar(props: { ramp: EmpiricalRamp | undefined, basemap: Basemap }): ReactNode {
    // do this as a table with 10 columns, each 10% wide and
    // 2 rows. Top one is the colorbar, bottom one is the
    // labels.
    const valuesRef = useRef<HTMLDivElement>(null)
    const shouldRotate: boolean = useSyncExternalStore(onWidthChange, () => {
        if (valuesRef.current === null) {
            return false
        }
        const current = valuesRef.current
        const containers = current.querySelectorAll('.containerOfXticks')
        // eslint-disable-next-line @typescript-eslint/prefer-for-of -- this isn't a loop over an array
        for (let i = 0; i < containers.length; i++) {
            const container = containers[i] as HTMLDivElement
            const contained: HTMLDivElement | null = container.querySelector('.containedOfXticks')
            if (contained === null) {
                continue
            }
            if (contained.offsetWidth > container.offsetWidth * 0.9) {
                return true
            }
        }
        return false
    })

    const furthest = useMemo(() => props.ramp === undefined ? undefined : furthestColor(props.ramp.ramp.map(x => x[1])), [props.ramp])

    if (props.ramp === undefined) {
        return <div></div>
    }

    const ramp = props.ramp.ramp
    const label = props.ramp.label
    const values = props.ramp.interpolations
    const unit = props.ramp.unit
    const style = colorbarStyleFromBasemap(props.basemap)

    const createValue = (stat: number): ReactNode => {
        return (
            <div className="centered_text" style={style}>
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

    const valuesDivs = (rotate: boolean): ReactNode[] => values.map((x, i) => (
        <div
            key={i}
            style={{
                width,
                // height: rotate ? '2em' : '1em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            className="containerOfXticks"
        >
            <div
                style={{
                    // transform: rotate ? 'rotate(-45deg)' : 'none',
                    writingMode: rotate ? 'sideways-lr' : 'horizontal-tb',
                    padding: rotate ? '0.5em' : '0',
                    // transformOrigin: 'center',
                    // whiteSpace: 'nowrap',
                    // fontSize: rotate ? '0.8em' : '1em',
                }}
                className="containedOfXticks"
            >
                {createValue(x)}
            </div>
        </div>
    ))

    return (
        <div style={{ ...style, position: 'relative' }}>
            <div style={{ display: 'flex', width: '100%' }}>
                {
                    values.map((x, i) => (
                        <div
                            key={i}
                            style={{
                                width, height: '1em',
                                backgroundColor: interpolateColor(ramp, props.ramp!.scale.forward(x), furthest),
                                marginLeft: '1px',
                                marginRight: '1px',
                            }}
                        >
                        </div>
                    ))
                }
            </div>
            <div ref={valuesRef} style={{ position: 'absolute', top: 0, left: 0, display: 'flex', width: '100%', visibility: 'hidden' }}>{valuesDivs(false)}</div>
            <div style={{ display: 'flex', width: '100%' }}>{valuesDivs(shouldRotate)}</div>
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
    editInsets?: EditMultipleInsets
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
                    key={stableStringify({ currentInsets, editInsets: !!props.editInsets })}
                    editInsets={props.editInsets}
                />
            </div>
            <div style={{ height: '8%', width: '100%' }} ref={props.colorbarRef}>
                <Colorbar
                    ramp={empiricalRamp}
                    basemap={basemap}
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

export function MapperPanel(props: { mapSettings: MapSettings, view: boolean, counts: CountsByUT }): ReactNode {
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

    const jsonedSettings = JSON.stringify({
        ...mapSettings,
        script: {
            uss: unparse(mapSettings.script.uss),
        },
    })

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
        return (mapSettings.geographyKind === undefined || mapSettings.universe === undefined)
            ? <DisplayResults results={[{ kind: 'error', type: 'error', value: 'Select a Universe and Geography Kind', location: noLocation }]} editor={false} />
            : (
                    <MapComponent
                        geographyKind={mapSettings.geographyKind}
                        universe={mapSettings.universe}
                        uss={uss}
                        mapRef={mapRef}
                        setErrors={setErrors}
                        colorbarRef={colorbarRef}
                        editInsets={editInsets ? (i, e) => { setMapSettingsWrapper({ ...mapSettings, script: { uss: doEditInsets(mapSettings, [i, e]) } }) } : undefined}
                    />
                )
    }

    const headerTextClass = useHeaderTextClass()

    const [editInsets, setEditInsets] = useState(false)

    const colors = useColors()

    if (props.view) {
        return mapperPanel()
    }

    return (
        <PageTemplate>
            <div>
                <div className={headerTextClass}>Urban Stats Mapper (beta)</div>
                <MapperSettings
                    mapSettings={mapSettings}
                    setMapSettings={setMapSettingsWrapper}
                    errors={errors}
                    counts={props.counts}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5em' }}>
                    <Export
                        mapRef={mapRef}
                        colorbarRef={colorbarRef}
                    />
                    {
                        !editInsets && canEditInsets(mapSettings).result && (
                            <div style={{
                                display: 'flex',
                                gap: '0.5em',
                                margin: '0.5em 0',
                            }}
                            >
                                <button onClick={() => { setEditInsets(true) }}>
                                    Edit Insets
                                </button>
                            </div>
                        )
                    }
                    <ImportExportCode
                        mapSettings={mapSettings}
                        setMapSettings={setMapSettingsWrapper}
                    />
                </div>
                {
                    editInsets && (
                        <div style={{
                            backgroundColor: colors.slightlyDifferentBackgroundFocused,
                            borderRadius: '5px',
                            padding: '10px',
                            margin: '10px 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '0.5em',
                        }}
                        >
                            <div>
                                <b>Editing Insets.</b>
                                {' '}
                                Pans and zooms to maps will be reflected permanently. Drag inset frames to reposition and resize.
                            </div>
                            <button onClick={() => { setEditInsets(false) }}>
                                Stop Editing
                            </button>
                        </div>
                    )
                }
                {
                    mapperPanel()
                }
            </div>
        </PageTemplate>
    )
}

function canEditInsets(settings: MapSettings):
    { result: true, edit: (newArgVal: UrbanStatsASTExpression) => MapUSS, arg: { present: true, value: UrbanStatsASTExpression } | { present: false, universe: Universe } }
    | { result: false } {
    const uss = settings.script.uss
    let call, insetsArg
    if (
        uss.type === 'statements'
        && (call = uss.result[1].rest[0].value)
        && call.type === 'call'
        && ((insetsArg = call.args.find(arg => arg.type === 'named' && arg.name.node === 'insets')) || true)
        && (insetsArg === undefined || !hasCustomNode(insetsArg))
    ) {
        const resolvedCall = call
        const resolvedInsetsArg = insetsArg
        const edit = (newArgVal: UrbanStatsASTExpression): MapUSS => {
            return {
                ...uss,
                result: [
                    uss.result[0],
                    {
                        ...uss.result[1],
                        rest: [
                            {
                                ...uss.result[1].rest[0],
                                value: {
                                    ...resolvedCall,
                                    args: resolvedCall.args.map(arg => arg === resolvedInsetsArg ? { ...arg, value: newArgVal } : arg),
                                },
                            },
                        ],
                    },
                ],
            }
        }
        if (insetsArg === undefined) {
            if (settings.universe === undefined) {
                return { result: false }
            }
            return { result: true, edit, arg: { present: false, universe: settings.universe } }
        }
        return { result: true, edit, arg: { present: true, value: insetsArg.value } }
    }
    return { result: false }
}

function doEditInsets(settings: MapSettings, edit: Parameters<EditMultipleInsets>): MapUSS {
    const canEdit = canEditInsets(settings)
    assert(canEdit.result, 'Trying to do an inset edit on USS that should not be inset editable')

    let arg: UrbanStatsASTExpression
    if (!canEdit.arg.present) {
        arg = loadInsetExpression(canEdit.arg.universe)
    }
    else {
        arg = canEdit.arg.value
    }

    // Edit the specified index (maybe need to deconstruct it first)
    assert(arg.type === 'call' && arg.args[0].value.type === 'vectorLiteral', 'Unexpected inset arg structure')
    return canEdit.edit(editInsetsList(arg.args[0].value, edit))
}

function editInsetsList(
    vec: UrbanStatsASTExpression & { type: 'vectorLiteral' },
    [index, newInset]: Parameters<EditMultipleInsets>,
): UrbanStatsASTExpression & { type: 'vectorLiteral' } {
    // TODO
    return vec
}
