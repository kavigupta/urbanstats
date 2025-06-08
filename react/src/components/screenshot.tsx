import domtoimage from 'dom-to-image-more'
import { saveAs } from 'file-saver'
import React, { createContext, ReactNode, useContext } from 'react'

import { universePath } from '../navigation/links'
import { Colors } from '../page_template/color-themes'
import { isTesting } from '../utils/isTesting'

export function ScreenshotButton(props: { onClick: () => void }): ReactNode {
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
                zIndex: 2,
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
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 1,
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

function totalOffset(element: Element | null): { top: number, left: number } {
    if (!(element instanceof HTMLElement)) {
        return { top: 0, left: 0 }
    }
    const parentOffset = totalOffset(element.offsetParent)
    return { top: element.offsetTop + parentOffset.top, left: element.offsetLeft + parentOffset.left }
}

export const mapBorderWidth = 1
export const mapBorderRadius = 5

export async function createScreenshot(config: ScreencapElements, universe: string | undefined, colors: Colors): Promise<void> {
    const overallWidth = config.overallWidth
    const heightMultiplier = config.heightMultiplier ?? 1

    async function screencapElement(ref: HTMLElement): Promise<HTMLCanvasElement> {
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
            resultContext.beginPath()
            resultContext.roundRect(x, y, w, h, (mapBorderRadius - mapBorderWidth * 2) * scaleFactor)
            resultContext.clip()

            if (isTesting()) {
                resultContext.fillStyle = `hsl(${(index % 10) * (360 / 10)} 50% 50%)`
                resultContext.fillRect(x, y, w, h)
            }
            else {
                resultContext.drawImage(
                    canvas,
                    x, y, w, h,
                )
            }

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

        return resultCanvas
    }

    const canvases = []
    for (const ref of config.elementsToRender) {
        try {
            canvases.push(await screencapElement(ref))
        }
        catch (e) {
            console.error(e)
        }
    }

    const canvas = document.createElement('canvas')

    const padAround = 100
    const padBetween = 50

    const banner = new Image()
    await new Promise<void>((resolve) => {
        banner.onload = () => { resolve() }
        banner.src = colors.screenshotFooterUrl
    })

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
        ctx.drawImage(flag, padAround + offset, start + offset, flagWidth, flagHeight)
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
