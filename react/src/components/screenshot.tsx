import domtoimage from 'dom-to-image-more'
import { saveAs } from 'file-saver'
import React, { createContext, ReactNode, useContext } from 'react'

import { universePath } from '../navigation/links'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { loadImage } from '../utils/Image'
import { TestUtils } from '../utils/TestUtils'
import { totalOffset } from '../utils/layout'
import { zIndex } from '../utils/zIndex'

export function ScreenshotButton(props: { onClick: () => void }): ReactNode {
    const colors = useColors()
    const screencapButton = (
        <div
            onClick={props.onClick}
            style={{
                height: '100%',
                cursor: 'pointer',
            }}
        >
            <img src="/screenshot.png" alt="Screenshot Button" style={{ height: '100%' }} />
        </div>
    )
    // if screenshot mode is on, put a loading circle over the image
    if (useScreenshotMode()) {
        const pad = 10 // pct
        const loadingCircle = (
            <div style={{
                position: 'absolute',
                height: `${100 - 2 * pad}%`,
                width: `${100 - 2 * pad}%`,
                top: `${pad}%`,
                left: `${pad}%`,
                borderRadius: '50%',
                border: '5px solid #fff',
                borderTop: '5px solid #000',
                animation: 'spin 2s linear infinite',
                zIndex: zIndex.screenshotSpin,
                animationPlayState: 'running',
            }}
            >
            </div>
        )
        const dimFilter = (
            <div style={{
                position: 'absolute',
                height: '100%',
                width: '100%',
                top: 0,
                left: 0,
                backgroundColor: `${colors.textMain}80`,
                zIndex: zIndex.screenshotDim,
            }}
            >
            </div>
        )
        return (
            <div style={{ position: 'relative', height: '100%', aspectRatio: '1/1' }}>
                {screencapButton}
                {dimFilter}
                {loadingCircle}
            </div>
        )
    }
    return screencapButton
}

export interface ScreencapElements {
    path: string
    overallWidth: number
    elementsToRender: HTMLElement[]
    heightMultiplier?: number
}

function drawImageIfNotTesting(context: CanvasRenderingContext2D, index: number, image: CanvasImageSource, x: number, y: number, w: number, h: number, testing: boolean): void {
    if (testing) {
        context.fillStyle = `hsl(${(index % 10) * (360 / 10)} 50% 50%)`
        context.fillRect(x, y, w, h)
    }
    else {
        context.drawImage(
            image,
            x, y, w, h,
        )
    }
}

function fixElementForScreenshot(element: HTMLElement): () => void {
    // Fixes https://github.com/kavigupta/urbanstats/issues/1145
    // Some sort of rounding issue in Chrome
    const attribTexts = Array.from(element.querySelectorAll('.maplibregl-ctrl-attrib-inner')).map(e => e as HTMLElement)
    attribTexts.forEach(text => text.style.width = `${Math.ceil(text.offsetWidth) + 1}px`)

    // Hide the fullscreen button
    const fullscreenButtons = Array.from(element.querySelectorAll('.maplibregl-ctrl:has(.maplibregl-ctrl-fullscreen)')).map(e => e as HTMLElement)
    fullscreenButtons.forEach(button => button.style.visibility = 'hidden')
    return () => {
        attribTexts.forEach(text => text.style.width = '')
        fullscreenButtons.forEach(button => button.style.visibility = '')
    }
}

export const mapBorderWidth = 1
export const defaultMapBorderRadius = 5

export async function screencapElement(ref: HTMLElement, overallWidth: number, heightMultiplier: number, {
    mapBorderRadius = defaultMapBorderRadius,
    // eslint-disable-next-line no-restricted-syntax -- Default value
    testing = TestUtils.shared.isTesting,
}: { mapBorderRadius?: number, testing?: boolean } = {}): Promise<HTMLCanvasElement> {
    const unfixElement = fixElementForScreenshot(ref)

    /*
     * Safari is flaky at rendering canvases the way `domtoimage` renders them.
     * We work around this by rendering the canvases first, then excluding them from the element render.
     */
    const scaleFactor = overallWidth / ref.offsetWidth

    const resultCanvas = document.createElement('canvas')

    resultCanvas.width = ref.offsetWidth * scaleFactor
    resultCanvas.height = ref.offsetHeight * scaleFactor * heightMultiplier

    const resultContext = resultCanvas.getContext('2d')!

    const canvases = Array.from(ref.querySelectorAll('canvas'))

    const totalRefOffset = totalOffset(ref)

    for (const [index, canvas] of canvases.entries()) {
        const canvasOffset = totalOffset(canvas)
        // Can't just use bounding box, because it gets weird with transforms (e.g. zoom)
        const x = (canvasOffset.left - totalRefOffset.left + mapBorderWidth) * scaleFactor
        const y = (canvasOffset.top - totalRefOffset.top + mapBorderWidth) * scaleFactor
        const w = canvas.offsetWidth * scaleFactor
        const h = canvas.offsetHeight * scaleFactor

        resultContext.save()
        if (mapBorderRadius !== 0) {
            resultContext.beginPath()
            resultContext.roundRect(x, y, w, h, (mapBorderRadius - mapBorderWidth * 2) * scaleFactor)
            resultContext.clip()
        }

        drawImageIfNotTesting(resultContext, index, canvas, x, y, w, h, testing)

        resultContext.restore()
    }

    const refCanvas = await domtoimage.toCanvas(ref, {
        bgcolor: 'transparent',
        height: resultCanvas.height,
        width: resultCanvas.width,
        style: {
            transform: `scale(${scaleFactor})`,
            transformOrigin: 'top left',
        },
        filter: node => !(node instanceof HTMLCanvasElement),
    })

    resultContext.drawImage(refCanvas, 0, 0)

    unfixElement()

    return resultCanvas
}

export async function createScreenshot(config: ScreencapElements, universe: string | undefined, colors: Colors): Promise<void> {
    const overallWidth = config.overallWidth
    const heightMultiplier = config.heightMultiplier ?? 1

    const canvases = []
    for (const ref of config.elementsToRender) {
        try {
            canvases.push(await screencapElement(ref, overallWidth, heightMultiplier))
        }
        catch (e) {
            console.error(e)
        }
    }

    const canvas = document.createElement('canvas')

    const padAround = 100
    const padBetween = 50

    const banner = await loadImage(colors.screenshotFooterUrl)

    const bannerScale = overallWidth / banner.width
    const bannerHeight = banner.height * bannerScale

    canvas.width = padAround * 2 + overallWidth
    canvas.height = padAround + padBetween * (canvases.length - 1) + canvases.reduce((a, b) => a + b.height, 0) + bannerHeight

    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = colors.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    let start = padAround
    for (const elementCanvas of canvases) {
        ctx.drawImage(elementCanvas, padAround, start)
        start += elementCanvas.height + padBetween
    }

    start -= padBetween

    ctx.drawImage(banner, padAround, start, overallWidth, bannerHeight)

    if (universe !== undefined) {
        const flag = new Image()
        flag.src = universePath(universe)
        await new Promise<void>((resolve) => {
            flag.onload = () => { resolve() }
        })
        // draw on bottom left, same height as banner
        const flagHeight = bannerHeight / 2
        const offset = flagHeight / 2
        const flagWidth = flag.width * flagHeight / flag.height
        drawImageIfNotTesting(ctx, canvases.length, flag, padAround + offset, start + offset, flagWidth, flagHeight, TestUtils.shared.isTesting)
    }

    canvas.toBlob(function (blob) {
        saveAs(blob!, config.path)
    })
}

// eslint-disable-next-line no-restricted-syntax -- Context declaration
export const ScreenshotContext = createContext(false)

export function useScreenshotMode(): boolean {
    return useContext(ScreenshotContext)
}
