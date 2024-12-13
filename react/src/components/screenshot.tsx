import domtoimage from 'dom-to-image-more'
import { saveAs } from 'file-saver'
import React, { createContext, ReactNode, useContext } from 'react'

import { universePath } from '../navigation/links'
import { Colors } from '../page_template/color-themes'

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

export async function createScreenshot(config: ScreencapElements, universe: string | undefined, colors: Colors): Promise<void> {
    const overallWidth = config.overallWidth
    const heightMultiplier = config.heightMultiplier ?? 1

    async function screencapElement(ref: HTMLElement): Promise<[string, number]> {
        const scaleFactor = overallWidth / ref.offsetWidth
        const link = await domtoimage.toPng(ref, {
            bgcolor: colors.background,
            height: ref.offsetHeight * scaleFactor * heightMultiplier,
            width: ref.offsetWidth * scaleFactor,
            style: {
                transform: `scale(${scaleFactor})`,
                transformOrigin: 'top left',
            },
        })
        return [link, scaleFactor * ref.offsetHeight * heightMultiplier]
    }

    const pngLinks = []
    const heights = []
    for (const ref of config.elementsToRender) {
        try {
            const [pngLink, height] = await screencapElement(ref)
            pngLinks.push(pngLink)
            heights.push(height)
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
        banner.src = '/screenshot_footer.svg'
    })

    const bannerScale = overallWidth / banner.width
    const bannerHeight = banner.height * bannerScale

    canvas.width = padAround * 2 + overallWidth
    canvas.height = padAround + padBetween * (pngLinks.length - 1) + heights.reduce((a, b) => a + b, 0) + bannerHeight

    const ctx = canvas.getContext('2d')!
    const imgs = []

    for (const pngLink of pngLinks) {
        const img = new Image()
        img.src = pngLink
        imgs.push(img)
    }
    ctx.fillStyle = colors.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (const img of imgs) {
        await new Promise<void>((resolve) => {
            img.onload = () => { resolve() }
        })
    }
    let start = padAround
    for (const img of imgs) {
        ctx.drawImage(img, padAround, start)
        start += img.height + padBetween
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
