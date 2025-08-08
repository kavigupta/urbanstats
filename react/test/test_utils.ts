import fs from 'fs'
import path from 'path'
import { gzipSync, gunzipSync } from 'zlib'

import chalkTemplate from 'chalk-template'
import downloadsFolder from 'downloads-folder'
import { ClientFunction, Selector } from 'testcafe'
import xmlFormat from 'xml-formatter'

import type { TestWindow } from '../src/utils/TestUtils'
import { checkString } from '../src/utils/checkString'

export const target = process.env.URBANSTATS_TEST_TARGET ?? 'http://localhost:8000'
export const searchField = Selector('input').withAttribute('placeholder', 'Search Urban Stats')
export const getLocation = ClientFunction(() => document.location.href)
export const getLocationWithoutSettings = ClientFunction(() => {
    const url = new URL(document.location.href)
    url.searchParams.delete('s')
    return url.toString()
})

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
        await t.wait(1000)
    }
    await t.wait(1000) // Wait for map to finish rendering
}

export async function waitForQuizLoading(t: TestController): Promise<void> {
    // Wait for various components that need to load
    while (await Selector(`[data-test-loading-quiz=true]`).exists) {
        // this really shouldn't take that long to load, a few extra checks should be fine
        await t.wait(100)
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
        // disable the map, so that we're not testing the tiles
        for (const x of Array.from(document.getElementsByClassName('maplibregl-canvas-container'))) {
            if (x instanceof HTMLElement) {
                x.style.visibility = 'hidden'
            }
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

export async function grabDownload(t: TestController, button: Selector, wait: number = 3000): Promise<void> {
    await prepForImage(t, { hover: true, wait: true })
    await t
        .click(button)
    await t.wait(wait)
    await copyMostRecentFile(t)
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

async function copyMostRecentFile(t: TestController): Promise<void> {
    // copy the file to the screenshots folder
    // @ts-expect-error -- TestCafe doesn't have a public API for the screenshots folder
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- TestCafe doesn't have a public API for the screenshots folder
    const screenshotsFolder: string = t.testRun.opts.screenshots.path ?? (() => { throw new Error() })()
    let mrdp: string
    while (!(mrdp = mostRecentDownloadPath()).endsWith('.png')) {
        console.warn(chalkTemplate`{yellow No PNG file found in downloads folder, waiting for download to complete}`)
        // wait for the download to finish
        await t.wait(1000)
    }
    fs.copyFileSync(mrdp, path.join(screenshotsFolder, screenshotPath(t)))
}

export async function downloadOrCheckString(t: TestController, string: string, name: string, format: 'json' | 'xml'): Promise<void> {
    const pathToFile = path.join(__dirname, '..', '..', 'tests', 'reference_strings', `${name}.${format}.gz`)

    switch (format) {
        case 'json':
            string = JSON.stringify(JSON.parse(string), null, 2)
            break
        case 'xml':
            string = xmlFormat(string)
            break
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- We might want to change this variable
    if (checkString) {
        const expected = gunzipSync(fs.readFileSync(pathToFile)).toString('utf8')
        if (string !== expected) {
            // Using this because these strings are massive and the diff generation times out
            await t.expect(false).ok(`String does not match expected value`)
        }
    }
    else {
        fs.writeFileSync(pathToFile, gzipSync(string))
        fs.utimesSync(pathToFile, 0, 0)
    }
}

export async function safeClearLocalStorage(): Promise<void> {
    await flaky(() =>
        ClientFunction(() => {
            (window as unknown as TestWindow).testUtils.safeClearLocalStorage()
        })(),
    )
}

const consoleEnabled = new WeakSet()

async function printConsoleMessages(t: TestController): Promise<void> {
    const cdp = await t.getCurrentCDPSession()
    if (consoleEnabled.has(cdp)) {
        return
    }
    consoleEnabled.add(cdp)
    cdp.Console.on('messageAdded', (event) => {
        const timestamp = new Date().toISOString()
        let text: string
        switch (event.message.level) {
            case 'error':
                text = chalkTemplate`{red ${event.message.text}}`
                break
            case 'warning':
                text = chalkTemplate`{yellow ${event.message.text}}`
                break
            default:
                text = event.message.text
        }
        console.warn(chalkTemplate`{gray ${timestamp} From Browser:} ${text}`)
    })
    await cdp.Console.enable()
}

const networkEnabled = new WeakSet()
const requests = new Map<string, unknown>()

async function printFailedNetworkRequests(t: TestController): Promise<void> {
    const cdp = await t.getCurrentCDPSession()
    if (networkEnabled.has(cdp)) {
        return
    }
    networkEnabled.add(cdp)
    cdp.Network.on('requestWillBeSent', (event) => {
        requests.set(event.requestId, event.request)
    })
    cdp.Network.on('loadingFailed', (event) => {
        if (!event.canceled) {
            console.error(chalkTemplate`{red Request failed}`, event, requests.get(event.requestId))
        }
    })
    await cdp.Network.enable({ })
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
            await printConsoleMessages(t)
            await printFailedNetworkRequests(t)
            screenshotNumber = 0
            await safeClearLocalStorage()
            await t.resizeWindow(1400, 800)
            if (beforeEach !== undefined) {
                await beforeEach(t)
            }
        }).skipJsErrors({ pageUrl: /google\.com/ })
}

export async function flaky<T>(doThing: () => Promise<T>): Promise<T> {
    while (true) {
        try {
            return await doThing()
        }
        catch (error) {
            console.error(chalkTemplate`{red flaky failed with error}`, error)
        }
    }
}

export async function arrayFromSelector(selector: Selector): Promise<Selector[]> {
    return Array.from({ length: await selector.count }, (_, n) => selector.nth(n))
}

export async function waitForPageLoaded(t: TestController): Promise<void> {
    while (await Selector('#pageState_kind').value !== 'loaded') {
        await t.wait(1000)
    }
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

export async function waitForSelectedSearchResult(t: TestController): Promise<string> {
    const selectedSearchResult = Selector('[data-test-id=selected-search-result]')
    await t.expect(selectedSearchResult.exists).ok({ timeout: 10000 })
    return await selectedSearchResult.textContent
}

export async function doSearch(t: TestController, searchTerm: string): Promise<void> {
    await t.typeText(searchField, searchTerm)
    await waitForSelectedSearchResult(t)
    await t.pressKey('enter')
}

export async function createComparison(t: TestController, searchTerm: string, expectResult?: string): Promise<void> {
    const otherRegion = Selector('input[placeholder="Other region..."],input[placeholder="Name"]')
    await t
        .click(otherRegion)
        .typeText(otherRegion, searchTerm)
    const result = await waitForSelectedSearchResult(t)
    if (expectResult !== undefined) {
        await t.expect(result).eql(expectResult)
    }
    await t.pressKey('enter')
}

export async function getAllElements(selector: Selector): Promise<NodeSnapshot[]> {
    return Promise.all(Array.from({ length: await selector.count }).map((_, i) => selector.nth(i)()))
}

export function mapElement(r: RegExp): Selector {
    return Selector('div').withAttribute('clickable-polygon', r)
}

export async function clickMapElement(t: TestController, r: RegExp): Promise<void> {
    const element = mapElement(r)
    const clickablePolygon: string = (await element.getAttribute('clickable-polygon'))!
    await t.eval(() => {
        const cm = (window as unknown as {
            clickMapElement: (longname: string) => void
        }).clickMapElement
        cm(clickablePolygon)
    }, { dependencies: { clickablePolygon } })
}

export async function dataValues(): Promise<string[]> {
    const selector = Selector('span').withAttribute('class', /testing-statistic-value/)
    const values = [] as string[]
    for (let i = 0; i < await selector.count; i++) {
        values.push(await selector.nth(i).innerText)
    }
    return values
}

export function cdpSessionWithSessionId<T extends Object>(cdpSession: T, sessionId: string): T {
    // https://issues.chromium.org/issues/406821212#comment2
    return new Proxy(cdpSession, {
        get(s, prop: keyof Object) {
            const value: unknown = s[prop]
            if (value instanceof Function) {
                return function (...args: unknown[]) {
                    return value.apply(s, args.concat([sessionId])) as unknown
                }
            }
            if (value instanceof Object) {
                return cdpSessionWithSessionId(value, sessionId)
            }
            return value
        },
    })
}

export async function clickUniverseFlag(t: TestController, alt: string): Promise<void> {
    await flaky(async () => { // Universe flag sometimes isn't loaded
        await t.click(
            Selector('img')
                .withAttribute('class', 'universe-selector-option')
                .withAttribute('alt', alt))
    })
}
