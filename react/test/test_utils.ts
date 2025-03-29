import fs from 'fs'
import path from 'path'

import downloadsFolder from 'downloads-folder'
import { ClientFunction, Selector } from 'testcafe'

export const target = process.env.URBANSTATS_TEST_TARGET ?? 'http://localhost:8000'
export const searchField = Selector('input').withAttribute('placeholder', 'Search Urban Stats')
export const getLocation = ClientFunction(() => document.location.href)
export const getLocationWithoutSettings = ClientFunction(() => {
    const url = new URL(document.location.href)
    url.searchParams.delete('s')
    return url.toString()
})

export const isTesting = true

export function comparisonPage(locations: string[]): string {
    const params = new URLSearchParams()
    params.set('longnames', JSON.stringify(locations))
    return `${target}/comparison.html?${params.toString()}`
}

export async function checkTextboxes(t: TestController, txts: string[]): Promise<void> {
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

export async function checkAllCategoryBoxes(t: TestController): Promise<void> {
    await withHamburgerMenu(t, async () => {
        const checkboxes = Selector('div.checkbox-setting:not([inert] *)')
            .filter((node) => {
                const label = node.querySelector('label')!.innerText
                return (
                    label !== 'Use Imperial Units'
                    && label !== 'Include Historical Districts'
                    && label !== 'Simple Ordinals'
                    && label !== '2020'
                    && label !== 'Main'
                    && label !== 'US Census'
                )
            }).find('input')
        for (let i = 0; i < await checkboxes.count; i++) {
            await t.click(checkboxes.nth(i))
        }
    })
    // reload
    await safeReload(t)
}

export async function waitForLoading(t: TestController): Promise<void> {
    // Wait for various components that need to load
    while (await Selector('[data-test-loading=true]').exists) {
        await t.wait(10)
    }
    await t.wait(1000) // Wait for map to finish rendering
}

export async function waitForQuizLoading(t: TestController): Promise<void> {
    // Wait for various components that need to load
    while (await Selector(`[data-test-loading-quiz=true]`).exists) {
        // this really shouldn't take that long to load, a few extra checks should be fine
        await t.wait(10)
    }
}

async function prepForImage(t: TestController, options: { hover: boolean, wait: boolean }): Promise<void> {
    if (options.hover) {
        await t.hover('#searchbox') // Ensure the mouse pointer isn't hovering over any elements that change appearance when hovered over
    }
    if (options.wait) {
        await t.wait(1000)
    }
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

        // stop all animations (intended for moving spinners)
        document.querySelectorAll('[style*=animation]').forEach((element) => { (element as HTMLElement).style.animation = 'none' })
    })
    // Wait for the map to finish loading
    await waitForLoading(t)
}

let screenshotNumber = 0

function screenshotPath(t: TestController): string {
    screenshotNumber++
    return `${t.browser.name}/${t.test.name}-${screenshotNumber}.png`
}

export async function screencap(t: TestController, { fullPage = true, wait = true }: { fullPage?: boolean, wait?: boolean } = {}): Promise<void> {
    await prepForImage(t, { hover: fullPage, wait })
    return t.takeScreenshot({
    // include the browser name in the screenshot path
        path: screenshotPath(t),
        fullPage,
    })
}

export async function grabDownload(t: TestController, button: Selector): Promise<void> {
    await prepForImage(t, { hover: true, wait: true })
    await t
        .click(button)
    await t.wait(3000)
    copyMostRecentFile(t)
}

export async function downloadImage(t: TestController): Promise<void> {
    const download = Selector('img').withAttribute('src', '/screenshot.png')
    await grabDownload(t, download)
}

export async function downloadHistogram(t: TestController, nth: number): Promise<void> {
    const download = Selector('img').withAttribute('src', '/download.png').nth(nth)
    await grabDownload(t, download)
}

export function mostRecentDownloadPath(): string {
    // get the most recent file in the downloads folder
    const files = fs.readdirSync(downloadsFolder())
    const sorted = files.map(x => path.join(downloadsFolder(), x)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    return sorted[0]
}

function copyMostRecentFile(t: TestController): void {
    // copy the file to the screenshots folder
    // @ts-expect-error -- TestCafe doesn't have a public API for the screenshots folder
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- TestCafe doesn't have a public API for the screenshots folder
    const screenshotsFolder: string = t.testRun.opts.screenshots.path ?? (() => { throw new Error() })()
    fs.copyFileSync(mostRecentDownloadPath(), path.join(screenshotsFolder, screenshotPath(t)))
}

export async function downloadOrCheckString(t: TestController, string: string, name: string): Promise<void> {
    const pathToFile = path.join(__dirname, '..', '..', 'tests', 'reference_strings', `${name}.txt`)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- We might want to change this variable
    if (isTesting) {
        const expected = fs.readFileSync(pathToFile, 'utf8')
        await t.expect(string).eql(expected)
    }
    else {
        fs.writeFileSync(pathToFile, string)
    }
}

export function urbanstatsFixture(name: string, url: string, beforeEach: undefined | ((t: TestController) => Promise<void>) = undefined): FixtureFn {
    if (url.startsWith('/')) {
        url = target + url
    }
    else {
        // assert url starts with TARGET
        if (!url.startsWith(target)) {
            throw new Error(`URL ${url} does not start with ${target}`)
        }
    }
    return fixture(name)
        .page(url)
        .beforeEach(async (t) => {
            screenshotNumber = 0
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

export async function waitForPageLoaded(t: TestController): Promise<void> {
    await t.expect(Selector('#pageState_kind').value).eql('loaded') // Wait for initial loading to finish
}

export function pageDescriptorKind(): Promise<string | undefined> {
    return Selector('#pageState_current_descriptor_kind').value
}

export async function safeReload(t: TestController): Promise<void> {
    // eslint-disable-next-line no-restricted-syntax -- This is the utility that replaces location.reload()
    await t.eval(() => setTimeout(() => { location.reload() }, 0))
    await waitForPageLoaded(t)
}

export const openInNewTabModifiers = process.platform === 'darwin' ? { meta: true } : { ctrl: true }

export async function waitForSelectedSearchResult(t: TestController): Promise<void> {
    await t.expect(Selector('[data-test-id=selected-search-result]').exists).ok()
}

export async function doSearch(t: TestController, searchTerm: string): Promise<void> {
    await t.typeText(searchField, searchTerm)
    await waitForSelectedSearchResult(t)
    await t.pressKey('enter')
}

export async function createComparison(t: TestController, searchTerm: string): Promise<void> {
    const otherRegion = Selector('input').withAttribute('placeholder', 'Other region...')
    await t
        .click(otherRegion)
        .typeText(otherRegion, searchTerm)
    await waitForSelectedSearchResult(t)
    await t.pressKey('enter')
}

export function mapElement(r: RegExp): Selector {
    return Selector('div').withAttribute('clickable-polygon', r)
}
