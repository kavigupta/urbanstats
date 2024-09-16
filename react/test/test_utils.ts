import fs from 'fs'
import path from 'path'

import downloadsFolder from 'downloads-folder'
import { ClientFunction, Selector } from 'testcafe'

export const TARGET = process.env.URBANSTATS_TEST_TARGET ?? 'http://localhost:8000'
export const SEARCH_FIELD = Selector('input').withAttribute('placeholder', 'Search Urban Stats')
export const getLocation = ClientFunction(() => document.location.href)

export const IS_TESTING = true

export function comparison_page(locations: string[]): string {
    const params = new URLSearchParams()
    params.set('longnames', JSON.stringify(locations))
    return `${TARGET}/comparison.html?${params.toString()}`
}

export async function check_textboxes(t: TestController, txts: string[]): Promise<void> {
    const hamburgerMenu = Selector('div').withAttribute('class', 'hamburgermenu')
    if (await hamburgerMenu.exists) {
        await t.click(hamburgerMenu)
    }
    for (const txt of txts) {
        const checkbox = Selector('div').withAttribute('class', 'checkbox-setting')
        // filter for label
            .filter(node => node.querySelector('label')!.innerText === txt, { txt })
        // find checkbox
            .find('input')
        await t.click(checkbox)
    }
    if (await hamburgerMenu.exists) {
        await t.click(hamburgerMenu)
    }
}

export async function check_all_category_boxes(t: TestController): Promise<void> {
    const hamburgerMenu = Selector('div').withAttribute('class', 'hamburgermenu')
    if (await hamburgerMenu.exists) {
        await t.click(hamburgerMenu)
    }
    const checkboxes = Selector('div').withAttribute('class', 'checkbox-setting')
        .filter((node) => {
            const label = node.querySelector('label')!.innerText
            return (
                label !== 'Use Imperial Units'
                && label !== 'Include Historical Districts'
                && label !== 'Simple Ordinals'
                && label !== 'Race'
                && label !== 'Election'
            )
        }).find('input')
    for (let i = 0; i < await checkboxes.count; i++) {
        await t.click(checkboxes.nth(i))
    }
    if (await hamburgerMenu.exists) {
        await t.click(hamburgerMenu)
    }
    // reload
    await t.eval(() => { location.reload() })
}

async function prep_for_image(t: TestController): Promise<void> {
    await t.wait(1000)
    await t.eval(() => {
    // disable the leaflet map
        for (const x of Array.from(document.getElementsByClassName('leaflet-tile-pane'))) {
            x.remove()
        }
        for (const x of Array.from(document.getElementsByClassName('map-container-for-testing'))) {
            const style = 'border-style: solid; border-color: #abcdef'
            x.setAttribute('style', style)
        }
        document.getElementById('current-version')!.innerHTML = '&lt;VERSION&gt;'
        document.getElementById('last-updated')!.innerHTML = '&lt;LAST UPDATED&gt;'
        for (const x of Array.from(document.getElementsByClassName('juxtastat-user-id'))) {
            x.innerHTML = '&lt;USER ID&gt;'
        }
    })
}

function test_file_name(): string {
    for (const arg of process.argv) {
        const match = /^test\/(.+)\.ts$/.exec(arg)
        if (match) {
            return match[1]
        }
    }
    throw new Error(`Test file not found in args: ${process.argv}`)
}

function screenshot_path(t: TestController): string {
    let number = 0
    const resultPath = (): string => `${test_file_name()}/${t.browser.name}/${t.test.name}-${number}.png`
    while (fs.existsSync(resultPath())) {
        number++
    }
    return resultPath()
}

export async function screencap(t: TestController): Promise<void> {
    await prep_for_image(t)
    // return t.takeElementScreenshot(Selector('body'), `${name}_${t.browser.name}.png`)
    return t.takeScreenshot({
    // include the browser name in the screenshot path
        path: screenshot_path(t),
        fullPage: true,
    })
}

export async function grab_download(t: TestController, button: Selector): Promise<void> {
    await prep_for_image(t)
    await t
        .click(button)
    await t.wait(3000)
    copy_most_recent_file(t)
}

export async function download_image(t: TestController): Promise<void> {
    const download = Selector('img').withAttribute('src', '/screenshot.png')
    await grab_download(t, download)
}

export async function download_histogram(t: TestController, nth: number): Promise<void> {
    const download = Selector('img').withAttribute('src', '/download.png').nth(nth)
    await grab_download(t, download)
}

export function most_recent_download_path(): string {
    // get the most recent file in the downloads folder
    const files = fs.readdirSync(downloadsFolder())
    const sorted = files.map(x => path.join(downloadsFolder(), x)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    return sorted[0]
}

function copy_most_recent_file(t: TestController): void {
    // copy the file to the screenshots folder
    const screenshotsFolder = path.join(__dirname, '..', 'screenshots')
    fs.copyFileSync(most_recent_download_path(), path.join(screenshotsFolder, screenshot_path(t)))
}

export async function download_or_check_string(t: TestController, string: string, name: string): Promise<void> {
    const path_to_file = path.join(__dirname, '..', '..', 'tests', 'reference_strings', `${name}.txt`)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- We might want to change this variable
    if (IS_TESTING) {
        const expected = fs.readFileSync(path_to_file, 'utf8')
        await t.expect(string).eql(expected)
    }
    else {
        fs.writeFileSync(path_to_file, string)
    }
}

export function urbanstatsFixture(name: string, url: string, beforeEach: undefined | ((t: TestController) => Promise<void>) = undefined): FixtureFn {
    if (url.startsWith('/')) {
        url = TARGET + url
    }
    else {
        // assert url starts with TARGET
        if (!url.startsWith(TARGET)) {
            throw new Error(`URL ${url} does not start with ${TARGET}`)
        }
    }
    return fixture(name)
        .page(url)
        .beforeEach(async (t) => {
            await t.eval(() => { localStorage.clear() })
            await t.resizeWindow(1400, 800)
            await t.eval(() => { location.reload() })
            if (beforeEach !== undefined) {
                await beforeEach(t)
            }
            // print out the outer size of the window
            console.log(`Outer size: ${await t.eval(() => [window.outerWidth, window.outerHeight])}`)
            // print out the size of the inner window
            console.log(`Inner size: ${await t.eval(() => [window.innerWidth, window.innerHeight])}`)
            // print out the size of the body element
            console.log(`Body size is now ${await t.eval(() => [document.body.clientWidth, document.body.clientHeight])}`)
        })
}

// export async function setInnerSize(t: TestController, width: number, height: number): Promise<void> {
//     await t.resizeWindow(width, height)
//     await t.eval(() => { location.reload() })
//     // console.log(`Resized window to ${newWidth}x${newHeight}`)
//     // console.log(`Inner size is now ${await t.eval(() => [window.innerWidth, window.innerHeight])}`)
//     // // print out the size of the body element
//     // console.log(`Body size is now ${await t.eval(() => [document.body.clientWidth, document.body.clientHeight])}`)
// }
