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
    await withHamburgerMenu(t, async () => {
        for (const txt of txts) {
            const checkbox = Selector('div.checkbox-setting:not([inert] *)')
            // filter for label
                .filter(node => node.querySelector('label')!.innerText === txt, { txt })
            // find checkbox
                .find('input')
            await t.click(checkbox)
        }
    })
}

export async function withHamburgerMenu(t: TestController, block: () => Promise<void>): Promise<void> {
    const hamburgerMenu = Selector('div').withAttribute('class', 'hamburgermenu')
    if (await hamburgerMenu.exists) {
        await t.click(hamburgerMenu)
    }
    await block()
    if (await hamburgerMenu.exists) {
        await t.click(hamburgerMenu)
    }
}

export async function check_all_category_boxes(t: TestController): Promise<void> {
    await withHamburgerMenu(t, async () => {
        const checkboxes = Selector('div.checkbox-setting:not([inert] *)')
            .filter((node) => {
                const label = node.querySelector('label')!.innerText
                return (
                    label !== 'Use Imperial Units'
                    && label !== 'Include Historical Districts'
                    && label !== 'Simple Ordinals'
                    && label !== 'Race'
                    && label !== 'Election'
                    && label !== '2020'
                    && label !== 'Main'
                )
            }).find('input')
        for (let i = 0; i < await checkboxes.count; i++) {
            await t.click(checkboxes.nth(i))
        }
    })
    // reload
    await t.eval(() => { location.reload() })
}

export async function waitForLoading(t: TestController): Promise<void> {
    // Wait for various components that need to load
    while (await Selector('[data-test-loading=true]').exists) {
        await t.wait(1000)
    }
    await t.wait(1000) // Wait for map to finish rendering
}

async function prep_for_image(t: TestController): Promise<void> {
    await t.hover('[alt="Screenshot Button"]') // Ensure the mouse pointer isn't hovering over any elements that change appearance when hovered over
    await t.wait(1000)
    await t.eval(() => {
        // disable the base map, so that we're not testing the tiles
        for (const x of Array.from(document.getElementsByClassName('leaflet-tile-pane'))) {
            x.remove()
        }
        for (const x of Array.from(document.getElementsByClassName('map-container-for-testing'))) {
            const style = 'border-style: solid; border-color: #abcdef'
            x.setAttribute('style', style)
        }
        const currentVersion = document.getElementById('current-version')
        if (currentVersion !== null) {
            currentVersion.innerHTML = '&lt;VERSION&gt;'
        }
        const lastUpdated = document.getElementById('last-updated')
        if (lastUpdated !== null) {
            lastUpdated.innerHTML = '&lt;LAST UPDATED&gt;'
        }
        for (const x of Array.from(document.getElementsByClassName('juxtastat-user-id'))) {
            x.innerHTML = '&lt;USER ID&gt;'
        }

        // remove the flashing text caret
        document.querySelectorAll('input[type=text]').forEach((element) => { element.setAttribute('style', `${element.getAttribute('style')} caret-color: transparent;`) })
    })
    // Wait for the map to finish loading
    await waitForLoading(t)
}

let screenshot_number = 0

function screenshot_path(t: TestController): string {
    screenshot_number++
    return `${t.browser.name}/${t.test.name}-${screenshot_number}.png`
}

export async function screencap(t: TestController): Promise<void> {
    await prep_for_image(t)
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
    // @ts-expect-error -- TestCafe doesn't have a public API for the screenshots folder
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- TestCafe doesn't have a public API for the screenshots folder
    const screenshotsFolder: string = t.testRun.opts.screenshots.path ?? (() => { throw new Error() })()
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
            screenshot_number = 0
            await t.eval(() => { localStorage.clear() })
            await t.resizeWindow(1400, 800)
            if (beforeEach !== undefined) {
                await beforeEach(t)
            }
        })
}

export async function arrayFromSelector(selector: Selector): Promise<Selector[]> {
    return Array.from({ length: await selector.count }, (_, n) => selector.nth(n))
}
