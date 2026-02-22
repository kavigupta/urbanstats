import Color from 'color'
import React, { ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { MapInstance, MapRef } from 'react-map-gl/maplibre'

import { CSVExportData, generateMapperCSVData } from '../components/csv-export'
import { Basemap as BasemapComponent, PointFeatureCollection, Polygon, PolygonFeatureCollection } from '../components/map-common'
import { screencapElement, ScreenshotContext } from '../components/screenshot'
import valid_geographies from '../data/mapper/used_geographies'
import universes_ordered from '../data/universes_ordered'
import { loadProtobuf } from '../load_json'
import { boundingBox, geometry } from '../map-partition'
import { consolidatedShapeLink, indexLink } from '../navigation/links'
import { RelativeLoader } from '../navigation/loading'
import { Colors, colorThemes } from '../page_template/color-themes'
import { OverrideTheme, useColors } from '../page_template/colors'
import { loadCentroids } from '../syau/load'
import { Universe } from '../universe'
import { getAllParseErrors } from '../urban-stats-script/ast'
import { doRender } from '../urban-stats-script/constants/color-utils'
import { Inset } from '../urban-stats-script/constants/insets'
import { instantiate } from '../urban-stats-script/constants/scale'
import { TextBox } from '../urban-stats-script/constants/text-box'
import { EditorError } from '../urban-stats-script/editor-utils'
import { noLocation } from '../urban-stats-script/location'
import { USSOpaqueValue } from '../urban-stats-script/types-values'
import { executeAsync } from '../urban-stats-script/workerManager'
import { loadImage } from '../utils/Image'
import { editIndex, EditSeq } from '../utils/array-edits'
import { furthestColor, interpolateColor } from '../utils/color'
import { computeAspectRatioForInsets } from '../utils/coordinates'
import { ConsolidatedShapes, Feature, ICoordinate } from '../utils/protos'
import { NormalizeProto } from '../utils/types'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { Colorbar, RampToDisplay, styleFromBasemap } from './components/Colorbar'
import { InsetMap } from './components/InsetMap'
import { AddTextBox, MapTextBoxComponent } from './components/MapTextBox'
import { loadInsets } from './context'
import { splitLayoutContext } from './settings/EditMapperPanel'
import { Basemap, computeUSS, MapSettings } from './settings/utils'

const mapUpdateInterval = 500

export function useMapGenerator({ mapSettings }: { mapSettings: MapSettings }): MapGenerator {
    const cache = useRef<MapCache>({})
    const updateTime = useRef(Date.now())

    const [currentGenerator, setCurrentGenerator] = useState<Promise<MapGenerator<{ loading: boolean }>>>(() => makeMapGenerator({ mapSettings, cache: cache.current, previousGenerator: undefined }))

    useEffect(() => {
        const timeSinceMapUpdate = Date.now() - updateTime.current
        if (timeSinceMapUpdate > mapUpdateInterval) {
            updateTime.current = Date.now()
            setCurrentGenerator(previousGenerator => makeMapGenerator({ mapSettings, cache: cache.current, previousGenerator }))
            return
        }
        else {
            updateTime.current = Date.now()
            const timeout = setTimeout(() => {
                setCurrentGenerator(previousGenerator => makeMapGenerator({ mapSettings, cache: cache.current, previousGenerator }))
            }, mapUpdateInterval - timeSinceMapUpdate)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [mapSettings]) // Do not change this effect list!!

    const { result, loading } = useOrderedResolve(currentGenerator, 'useMapGenerator')

    return result !== undefined
        ? {
                ...result,
                ui: props => result.ui({ ...props, loading }),
            }
        : {
                ui: () => ({ node: <EmptyMapLayout universe={mapSettings.universe} loading={loading} /> }),
                errors: [],
            }
}

type MapUIProps<T> = T & ({ mode: 'view' } | { mode: 'uss' } | { mode: 'insets', editInsets: EditSeq<Inset> } | { mode: 'textBoxes', editTextBoxes: EditSeq<TextBox> })

export interface MapGenerator<T = unknown> {
    ui: (props: MapUIProps<T>) => { node: ReactNode, exportImage?: () => Promise<HTMLCanvasElement> }
    exportGeoJSON?: () => string
    exportCSV?: CSVExportData
    errors: EditorError[]
}

async function makeMapGenerator({ mapSettings, cache, previousGenerator }: { mapSettings: MapSettings, cache: MapCache, previousGenerator: Promise<MapGenerator<{ loading: boolean }>> | undefined }): Promise<MapGenerator<{ loading: boolean }>> {
    const emptyMap = ({ loading }: { loading: boolean }): { node: ReactNode } => ({ node: <EmptyMapLayout universe={mapSettings.universe} loading={loading} /> })

    if (mapSettings.geographyKind === undefined || mapSettings.universe === undefined) {
        return {
            ui: emptyMap,
            errors: [{ kind: 'error', type: 'error', value: 'Select a Universe and Geography Kind', location: noLocation }],
        }
    }

    const stmts = computeUSS(mapSettings.script)

    const parseErrors = getAllParseErrors(stmts)
    if (parseErrors.length > 0) {
        const prev = await previousGenerator
        return {
            ...prev,
            ui: prev?.ui ?? emptyMap,
            errors: parseErrors.map(e => ({ ...e, kind: 'error' })),
        }
    }

    const execResult = await executeAsync({ descriptor: { kind: 'mapper', geographyKind: mapSettings.geographyKind, universe: mapSettings.universe }, stmts })

    if (execResult.resultingValue === undefined) {
        const prev = await previousGenerator
        return {
            ...prev,
            ui: prev?.ui ?? emptyMap,
            errors: execResult.error,
        }
    }

    const mapResultMain = execResult.resultingValue.value

    const csvExportCallback: CSVExportData = () => {
        const csvData = generateMapperCSVData(mapResultMain, execResult.context)
        const csvFilename = `${mapSettings.geographyKind}-${mapSettings.universe}-data.csv`
        return {
            csvData,
            csvFilename,
        }
    }

    const { features, mapChildren, ramp } = await loadMapResult({ mapResultMain, universe: mapSettings.universe, geographyKind: mapSettings.geographyKind, cache })

    function MapComponent({ props, exportImageRef }: { props: MapUIProps<{ loading: boolean }>, exportImageRef: (fn: () => Promise<HTMLCanvasElement>) => void }): ReactNode {
        const mapsRef: (MapRef | null)[] = []

        const mapsContainerRef = useRef<HTMLDivElement>(null)
        const wholeRenderRef = useRef<HTMLDivElement>(null)

        const insetsFeatures = (props.mode === 'insets' ? props.editInsets.edited : mapResultMain.value.insets).flatMap((inset) => {
            const insetFeatures = filterOverlaps(inset, features)
            if (insetFeatures.length === 0 && props.mode !== 'insets') {
                return []
            }
            return [{
                inset,
                insetFeatures,
            }]
        })

        const insetMaps = insetsFeatures.map(({ inset, insetFeatures }, i, insets) => {
            return (
                <InsetMap
                    i={i}
                    key={i}
                    inset={inset}
                    ref={e => mapsRef[i] = e}
                    container={mapsContainerRef}
                    numInsets={insets.length}
                    editInset={props.mode === 'insets'
                        ? editIndex(props.editInsets, i)
                        : undefined}
                    interactive={props.mode !== 'textBoxes'}
                >
                    {mapChildren(insetFeatures, ['uss', 'view'].includes(props.mode))}
                </InsetMap>
            )
        })

        const visibleInsets = insetsFeatures.map(({ inset }) => inset)

        const colorbar = (
            <Colorbar
                ramp={ramp}
                basemap={mapResultMain.value.basemap}
            />
        )

        const [screenshotMode, setScreenshotMode] = useState(false)

        const colors = useColors()

        exportImageRef(async () => {
            setScreenshotMode(true)
            const restoreMaps = mapsRef.map(r => r!.getMap()).map(prepareMapForImageExport)
            return new Promise((resolve) => {
                setTimeout(async () => {
                    const elementCanvas = await screencapElement(wholeRenderRef.current!, canonicalWidth * exportPixelRatio, 1, { mapBorderRadius: 0, testing: false })

                    const image = await mapImageExport(elementCanvas, mapResultMain.value.basemap, colors)

                    resolve(image)
                    setScreenshotMode(false)
                    restoreMaps.forEach((restore) => { restore() })
                })
            })
        })

        const textBoxes = props.mode === 'insets'
            ? undefined
            : (
                    <OverrideTheme theme="Light Mode">
                        {(props.mode === 'textBoxes' ? props.editTextBoxes.edited : mapResultMain.value.textBoxes).map((textBox, i, boxes) => (
                            <MapTextBoxComponent
                                container={mapsContainerRef}
                                key={i}
                                textBox={textBox}
                                i={i}
                                count={boxes.length}
                                edit={props.mode === 'textBoxes' ? editIndex(props.editTextBoxes, i) : undefined}
                            />
                        )).concat(props.mode === 'textBoxes' ? [<AddTextBox key="add" container={mapsContainerRef} add={props.editTextBoxes.add} />] : [])}
                    </OverrideTheme>
                )

        return (
            <ScreenshotContext.Provider value={screenshotMode}>
                <MapLayout
                    maps={insetMaps}
                    loading={props.loading}
                    colorbar={colorbar}
                    aspectRatio={computeAspectRatioForInsets(visibleInsets)}
                    mapsContainerRef={mapsContainerRef}
                    wholeRenderRef={wholeRenderRef}
                    textBoxes={textBoxes}
                />
            </ScreenshotContext.Provider>
        )
    }

    return {
        errors: execResult.error,
        exportCSV: csvExportCallback,
        exportGeoJSON: () => exportAsGeoJSON(features),
        ui: (props) => {
            let exportImage: () => Promise<HTMLCanvasElement>

            return {
                node: (
                    <MapComponent props={props} exportImageRef={fn => exportImage = fn} />
                ),
                exportImage: () => exportImage(),
            }
        },
    }
}

const exportPixelRatio = 4

function prepareMapForImageExport(map: MapInstance): () => void {
    const originalPixelRatio = map.getPixelRatio()
    map.setPixelRatio(exportPixelRatio)

    const attrib: HTMLElement | null = map.getContainer().querySelector('.maplibregl-ctrl-attrib')
    let resetAttrib: undefined | (() => void)
    if (attrib !== null) {
        const prevDisplay = attrib.style.display
        attrib.style.display = 'none'
        resetAttrib = () => attrib.style.display = prevDisplay
    }

    return () => {
        map.setPixelRatio(originalPixelRatio)
        resetAttrib?.()
    }
}

async function mapImageExport(elementCanvas: HTMLCanvasElement, basemap: Basemap, colors: Colors): Promise<HTMLCanvasElement> {
    const { backgroundColor, color } = styleFromBasemap(basemap, colors)
    const bannerUrl = color === undefined ? colors.screenshotFooterUrl : colorThemes[Color(color).l() < 50 ? 'Light Mode' : 'Dark Mode'].screenshotFooterUrl
    const bannerImage = await loadImage(bannerUrl)
    const bannerHeight = 50 * exportPixelRatio
    const bannerWidth = bannerImage.width * (bannerHeight / bannerImage.height)
    const bannerSquish = 10 * exportPixelRatio

    const resultCanvas = document.createElement('canvas')
    const ctx = resultCanvas.getContext('2d')!
    resultCanvas.width = elementCanvas.width
    resultCanvas.height = elementCanvas.height + bannerHeight - bannerSquish

    ctx.drawImage(elementCanvas, 0, 0)

    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, elementCanvas.height, elementCanvas.width, bannerHeight)

    ctx.drawImage(
        bannerImage,
        resultCanvas.width - bannerWidth,
        resultCanvas.height - bannerHeight,
        bannerWidth,
        bannerHeight,
    )

    return resultCanvas
}

function MapLayout({ maps, colorbar, loading, mapsContainerRef, aspectRatio, wholeRenderRef, textBoxes }: {
    maps: ReactNode
    textBoxes: ReactNode
    colorbar: ReactNode
    loading: boolean
    mapsContainerRef?: React.Ref<HTMLDivElement>
    aspectRatio: number
    wholeRenderRef?: React.Ref<HTMLDivElement>
}): ReactNode {
    return (
        <TransformConstantWidth>
            <div
                ref={wholeRenderRef}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    minHeight: 0, // https://stackoverflow.com/questions/36230944/prevent-flex-items-from-overflowing-a-container/66689926#66689926
                }}
            >
                <RelativeLoader loading={loading} />
                <div
                    style={{ width: '100%', aspectRatio }}
                >
                    <div
                        ref={mapsContainerRef}
                        style={{
                            aspectRatio,
                            position: 'relative',
                            maxHeight: '100%',
                            margin: 'auto',
                        }}
                    >
                        {maps}
                        {textBoxes}
                    </div>
                </div>
                {colorbar}
            </div>
        </TransformConstantWidth>
    )
}

function EmptyMapLayout({ universe, loading }: { universe?: Universe, loading: boolean }): ReactNode {
    const insets = loadInsets(universe ?? 'world')

    return (
        <MapLayout
            maps={insets.map((inset, i) => (
                <InsetMap
                    i={i}
                    key={i}
                    inset={inset}
                    container={React.createRef()}
                    numInsets={insets.length}
                    interactive={false}
                >
                    {null}
                </InsetMap>
            ))}
            textBoxes={null}
            loading={loading}
            colorbar={null}
            aspectRatio={computeAspectRatioForInsets(insets)}
        />
    )
}

async function loadMapResult({ mapResultMain: { opaqueType, value }, universe, geographyKind, cache }:
{
    mapResultMain: USSOpaqueValue & { opaqueType: 'cMap' | 'cMapRGB' | 'pMap' }
    universe: Universe
    geographyKind: typeof valid_geographies[number]
    cache: MapCache
}): Promise<{ features: GeoJSON.Feature[], mapChildren: (fs: GeoJSON.Feature[], clickable: boolean) => ReactNode, ramp: RampToDisplay }> {
    let ramp: RampToDisplay
    let colors: string[]
    switch (opaqueType) {
        case 'pMap':
        case 'cMap':
            const scale = instantiate(value.scale)
            const furthest = furthestColor(value.ramp.map(x => x[1]))
            const interpolations = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(scale.inverse)
            ramp = { type: 'ramp', value: { ramp: value.ramp, interpolations, scale, label: value.label, unit: value.unit } }
            colors = value.data.map(val => interpolateColor(value.ramp, scale.forward(val), furthest))
            break
        case 'cMapRGB':
            colors = value.dataR.map((r, i) => doRender({
                r,
                g: value.dataG[i],
                b: value.dataB[i],
                a: 1,
            }))
            ramp = { type: 'label', value: value.label }
            break
    }

    let features: GeoJSON.Feature[]
    let mapChildren: (fs: GeoJSON.Feature[], clickable: boolean) => ReactNode
    switch (opaqueType) {
        case 'pMap':
            const points: Point[] = Array.from(value.data.entries()).map(([i, dataValue]) => {
                return {
                    name: value.geo[i],
                    fillColor: colors[i],
                    fillOpacity: 1,
                    radius: Math.sqrt(value.relativeArea[i]) * value.maxRadius,
                    statistic: dataValue,
                }
            })

            features = await pointsGeojson(geographyKind, universe, points, cache)

            mapChildren = (fs, clickable) => <PointFeatureCollection features={fs} clickable={clickable} />

            break
        case 'cMap':
        case 'cMapRGB':
            const polys: Polygon[] = Array.from(colors.entries()).map(([i, color]) => {
                let meta
                switch (opaqueType) {
                    case 'cMap':
                        meta = { statistic: value.data[i] }
                        break
                    case 'cMapRGB':
                        meta = { statistic: [value.dataR[i], value.dataG[i], value.dataB[i]] }
                        break
                }

                return {
                    name: value.geo[i],
                    fillColor: color,
                    fillOpacity: 1,
                    color: doRender(value.outline.color),
                    weight: value.outline.weight,
                    ...meta,
                }
            })

            features = await polygonsGeojson(geographyKind, universe, polys, cache)

            mapChildren = (fs, clickable) => <PolygonFeatureCollection features={fs} clickable={clickable} />

            break
    }

    return {
        features,
        mapChildren: (fs, clickable) => (
            <>
                {mapChildren(fs, clickable)}
                <BasemapComponent basemap={value.basemap} />
            </>
        ),
        ramp,
    }
}

const canonicalWidth = 1200

function TransformConstantWidth({ children }: { children: ReactNode }): ReactNode {
    const [layout, setLayout] = useState({ scale: 1, top: 0, left: 0, selfDeterminedHeight: 0 })
    const ref = useRef<HTMLDivElement>(null)
    const childRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const updateScale = (): void => {
            if (ref.current === null || childRef.current === null) {
                return
            }
            const scale = Math.min(...[
                ref.current.offsetWidth / canonicalWidth,
                ...(ref.current.offsetHeight > 0 ? [ref.current.offsetHeight / childRef.current.offsetHeight] : []),
            ])
            setLayout({
                scale,
                top: Math.max(0, (ref.current.offsetHeight - childRef.current.offsetHeight * scale) / 2),
                left: Math.max(0, (ref.current.offsetWidth - childRef.current.offsetWidth * scale) / 2),
                selfDeterminedHeight: childRef.current.offsetHeight * scale,
            })
        }
        updateScale()

        const observer = new ResizeObserver(updateScale)
        observer.observe(ref.current!)
        observer.observe(childRef.current!)
        return () => {
            observer.disconnect()
        }
    }, [])

    return (
        <div ref={ref} style={{ ...(useContext(splitLayoutContext) ? { position: 'absolute' } : { height: layout.selfDeterminedHeight }), inset: 0 }}>
            <div
                ref={childRef}
                style={{
                    transform: `scale(${layout.scale})`,
                    transformOrigin: 'top left',
                    width: `${canonicalWidth}px`,
                    position: 'relative',
                    top: `${layout.top}px`,
                    left: `${layout.left}px`,
                }}
            >
                {children}
            </div>
        </div>
    )
}

function filterOverlaps(inset: Inset, features: GeoJSON.Feature[]): GeoJSON.Feature[] {
    const bbox = inset.coordBox
    if (!inset.mainMap) {
        features = features.filter((poly) => {
            const bounds = boundingBox(poly.geometry)
            // Check if the polygon overlaps the inset bounds
            return bounds.getWest() < bbox[2] && bounds.getEast() > bbox[0]
                && bounds.getNorth() > bbox[1] && bounds.getSouth() < bbox[3]
        })
    }
    return features
}

interface MapCache {
    geo?: { universe: Universe, geographyKind: typeof valid_geographies[number] } & (
        { type: 'points', centroidsByName: Map<string, ICoordinate> }
        | { type: 'polygons', polygonsByName: Map<string, GeoJSON.Geometry> }
    )
}

interface Point {
    name: string

    fillColor: string
    fillOpacity: number
    radius: number

    [meta: string]: unknown

}

async function pointsGeojson(geographyKind: typeof valid_geographies[number], universe: Universe, points: Point[], cache: MapCache): Promise<GeoJSON.Feature[]> {
    if (cache.geo?.type !== 'points' || cache.geo.universe !== universe || cache.geo.geographyKind !== geographyKind) {
        const idxLink = indexLink(universe, geographyKind)
        const articles = await loadProtobuf(idxLink, 'ArticleOrderingList')
        const centroids = await loadCentroids(universe, geographyKind, articles.longnames)

        const centroidsByName = new Map(articles.longnames.map((r, i) => [r, centroids[i]]))
        cache.geo = {
            type: 'points',
            universe,
            geographyKind,
            centroidsByName,
        }
    }

    const geo = cache.geo

    return points.map((point) => {
        const centroid = geo.centroidsByName.get(point.name)!

        return {
            type: 'Feature' as const,
            properties: { ...point },
            geometry: {
                type: 'Point',
                coordinates: [centroid.lon!, centroid.lat!],
            },
        }
    })
}

async function polygonsGeojson(geographyKind: typeof valid_geographies[number], universe: Universe, polygons: Polygon[], cache: MapCache): Promise<GeoJSON.Feature[]> {
    if (cache.geo?.type !== 'polygons' || cache.geo.universe !== universe || cache.geo.geographyKind !== geographyKind) {
        const universeIdx = universes_ordered.indexOf(universe)
        const shapes = (await loadProtobuf(consolidatedShapeLink(geographyKind), 'ConsolidatedShapes')) as NormalizeProto<ConsolidatedShapes>
        const polygonsByName = new Map<string, GeoJSON.Geometry>()
        for (let i = 0; i < shapes.longnames.length; i++) {
            if (shapes.universes[i].universeIdxs.includes(universeIdx)) {
                polygonsByName.set(shapes.longnames[i], geometry(shapes.shapes[i] as NormalizeProto<Feature>))
            }
        }
        cache.geo = {
            type: 'polygons',
            universe,
            geographyKind,
            polygonsByName,
        }
    }

    const geo = cache.geo

    return polygons.map((polygon) => {
        return {
            type: 'Feature' as const,
            properties: { ...polygon },
            geometry: geo.polygonsByName.get(polygon.name)!,
        }
    })
}

function exportAsGeoJSON(features: GeoJSON.Feature[]): string {
    return JSON.stringify(
        {
            type: 'FeatureCollection',
            features,
        },
        null,
        2,
    )
}
