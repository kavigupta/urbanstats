import fs from 'fs'
import { gunzipSync, gzipSync } from 'zlib'

import { ClientFunction, Selector } from 'testcafe'

import { target, downloadOrCheckString, waitForDownload, grabDownload, waitForLoading } from './test_utils'

export async function checkGeojson(t: TestController, path: string): Promise<void> {
    const laterThan = new Date().getTime()
    // download the geojson by clicking the button
    await t.click(Selector('button').withExactText('Export as GeoJSON'))
    const mrdp = await waitForDownload(t, laterThan, '.geojson')
    const mostRecentDownload = fs.readFileSync(mrdp, 'utf8')
    await downloadOrCheckString(t, mostRecentDownload, path, 'json')
}

export async function downloadPNG(t: TestController): Promise<void> {
    await waitForLoading()
    const download = Selector('button:not(:disabled)').withExactText('Export as PNG')
    await grabDownload(t, download, '.png') // wait for 6 seconds to ensure the download completes
}

export function checkSelector(label: RegExp): Selector {
    const labelEl = Selector('label').withText(label)
    const parent = labelEl.parent()
    const checkbox = parent.find('input[type="checkbox"]')
    return checkbox
}

export async function checkBox(t: TestController, label: RegExp): Promise<void> {
    await t.click(checkSelector(label))
}

export async function toggleCustomScript(t: TestController): Promise<void> {
    await checkBox(t, /^Enable custom script/)
}

export function urlFromCode(geographyKind: string, universe: string, code: string): string {
    const settingsJSON = JSON.stringify({
        geographyKind,
        universe,
        script: {
            uss: code,
        },
    })
    const url = `${target}/mapper.html?settings=${encodeURIComponent(gzipSync(settingsJSON).toString('base64'))}`
    return url
}

export function settingsFromURL(url: string): unknown {
    const encodedSettings = new URL(url).searchParams.get('settings') ?? (() => { throw new Error('no settings') })()
    return JSON.parse(gunzipSync(Buffer.from(encodedSettings, 'base64')).toString())
}

export function getCodeFromMainField(): Promise<string> {
    return Selector('#test-editor-body').textContent
}

export function getErrors(): Promise<string[]> {
    return ClientFunction(() =>
        Array.from(document.querySelectorAll('#test-editor-result')).map(element => element.textContent!),
    )()
}

export function getInput(original: string | RegExp, nth = 0): Selector {
    return Selector('input').withAttribute('value', original).nth(nth)
}

export async function replaceInput(t: TestController, original: string | RegExp, newv: string, nth = 0): Promise<void> {
    const inputSelector = getInput(original, nth)
    await t.click(inputSelector)
    await t.selectText(inputSelector)
    await t.typeText(inputSelector, newv)
    await t.pressKey('enter')
}

export async function drag(t: TestController, selector: Selector | string, deltaX: number, deltaY: number): Promise<void> {
    const elementRect = await Selector(selector).boundingClientRect
    const downEvent = { pointerId: 1, clientX: (elementRect.left + elementRect.right) / 2, clientY: (elementRect.bottom + elementRect.top) / 2 }
    const upEvent = { ...downEvent, clientX: downEvent.clientX + deltaX, clientY: downEvent.clientY + deltaY }
    await t.dispatchEvent(selector, 'pointerdown', downEvent).dispatchEvent(selector, 'pointermove', upEvent).dispatchEvent(selector, 'pointerup', upEvent)
}
