import fs from 'fs'
import { gunzipSync, gzipSync } from 'zlib'

import { Selector } from 'testcafe'

import { target, downloadOrCheckString, waitForDownload, grabDownload } from './test_utils'

export async function checkGeojson(t: TestController, path: string): Promise<void> {
    const laterThan = new Date().getTime()
    // download the geojson by clicking the button
    await t.click(Selector('button').withExactText('Export as GeoJSON'))
    await t.wait(1000) // sometimes downloading takes a little time
    const mrdp = await waitForDownload(t, laterThan, '.geojson')
    const mostRecentDownload = fs.readFileSync(mrdp, 'utf8')
    await downloadOrCheckString(t, mostRecentDownload, path, 'json')
}

export async function downloadPNG(t: TestController): Promise<void> {
    const download = Selector('button').withExactText('Export as PNG')
    await grabDownload(t, download, '.png') // wait for 6 seconds to ensure the download completes
}

export async function checkBox(t: TestController, label: RegExp): Promise<void> {
    const labelEl = Selector('label').withText(label)
    const parent = labelEl.parent()
    const checkbox = parent.find('input[type="checkbox"]')
    await t.click(checkbox)
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

export async function getCodeFromMainField(): Promise<string> {
    // id = test-editor-body
    const mainField = Selector('#test-editor-body')
    const code = await mainField.textContent
    return code
}

export async function getErrors(): Promise<string[]> {
    // all divs with id = test-editor-result
    const errorSelector = Selector('#test-editor-result')
    const errors: string[] = []
    for (let i = 0; i < await errorSelector.count; i++) {
        const errorText = await errorSelector.nth(i).textContent
        if (errorText) {
            errors.push(errorText)
        }
    }
    return errors
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
