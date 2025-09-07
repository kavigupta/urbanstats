import maplibregl from 'maplibre-gl'

import { Inset } from './map'

interface MapScreenshotParams {
    width: number
    height: number
    pixelRatio: number
    insetBorderColor: string
    backgroundColor?: string
}

function computeRelativeLocs(inset: Inset, params: MapScreenshotParams): { insetWidth: number, insetHeight: number, insetX: number, insetY: number } {
    const [x0, y0] = inset.bottomLeft
    const [x1, y1] = inset.topRight
    const insetWidth = (x1 - x0) * params.width
    const insetHeight = (y1 - y0) * params.height
    const insetX = x0 * params.width
    const insetY = (1 - y1) * params.height // Flip Y coordinate for canvas
    return { insetWidth, insetHeight, insetX, insetY }
}

export async function renderMap(
    ctx: CanvasRenderingContext2D,
    map: maplibregl.Map, inset: Inset,
    params: MapScreenshotParams,
): Promise<void> {
    const container = map.getContainer()
    const originalSize = {
        width: container.style.width || '',
        height: container.style.height || '',
    }
    const originalBounds = map.getBounds()
    const originalPixelRatio = map.getPixelRatio()

    const { insetWidth, insetHeight, insetX, insetY } = computeRelativeLocs(inset, params)

    // resize the container to the inset size / pixel ratio, so the map renders at high resolution
    // but text and other elements are not scaled
    container.style.width = `${insetWidth / params.pixelRatio}px`
    container.style.height = `${insetHeight / params.pixelRatio}px`

    map.setPixelRatio(params.pixelRatio)

    // Trigger map resize
    map.resize()

    let bounds = originalBounds
    if (inset.coordBox !== undefined) {
        const [west, south, east, north] = inset.coordBox
        bounds = new maplibregl.LngLatBounds(
            new maplibregl.LngLat(west, south),
            new maplibregl.LngLat(east, north),
        )
    }
    map.fitBounds(bounds, { animate: false, padding: 0 })

    const previousBackgroundColor = map.getPaintProperty('background', 'background-color')
    if (params.backgroundColor !== undefined) {
        map.setPaintProperty('background', 'background-color', params.backgroundColor)
    }

    // Wait for maps to re-render at high resolution
    await new Promise(resolve => setTimeout(resolve, 1000))

    const mapCanvas = map.getCanvas()

    // Draw the map content onto the main canvas
    ctx.drawImage(mapCanvas, insetX, insetY, insetWidth, insetHeight)

    if (!inset.mainMap) {
        ctx.strokeStyle = params.insetBorderColor
        ctx.lineWidth = 4
        ctx.strokeRect(insetX, insetY, insetWidth, insetHeight)
    }
    container.style.width = originalSize.width
    container.style.height = originalSize.height
    map.setPixelRatio(originalPixelRatio)
    map.resize()
    map.fitBounds(originalBounds, { animate: false })
    map.setPaintProperty('background', 'background-color', previousBackgroundColor)
}
