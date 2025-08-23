import fs from 'fs'
import { gzipSync } from 'zlib'

import { Selector } from 'testcafe'

import { target, downloadOrCheckString, waitForDownload, grabDownload, waitForLoading } from './test_utils'

export async function checkGeojson(t: TestController, path: string): Promise<void> {
    const laterThan = new Date().getTime()
    // download the geojson by clicking the button
    await t.click(Selector('button').withExactText('Export as GeoJSON'))
    await t.wait(1000) // sometimes downloading takes a little time
    const mrdp = await waitForDownload(t, laterThan)
    const mostRecentDownload = fs.readFileSync(mrdp, 'utf8')
    await downloadOrCheckString(t, mostRecentDownload, path, 'json')
}

export async function downloadPNG(t: TestController): Promise<void> {
    const download = Selector('button').withExactText('Export as PNG')
    await grabDownload(t, download) // wait for 6 seconds to ensure the download completes
}

export async function checkBox(t: TestController, label: RegExp): Promise<void> {
    const labelEl = Selector('label').withText(label)
    const parent = labelEl.parent()
    const checkbox = parent.find('input[type="checkbox"]')
    // console.log(.innerHTML)
    await t.click(checkbox)
    await waitForLoading(t)
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
    // eslint-disable-next-line no-console -- helpful for debugging the test
    console.log('url', url)
    return url
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
