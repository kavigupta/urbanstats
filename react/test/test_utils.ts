import fs from 'fs'
import path from 'path'
import { gzipSync, gunzipSync } from 'zlib'

import chalkTemplate from 'chalk-template'
import downloadsFolder from 'downloads-folder'
import { ClientFunction, Selector } from 'testcafe'
import xmlFormat from 'xml-formatter'

import type { TestWindow } from '../src/utils/TestUtils'
import { checkString } from '../src/utils/checkString'

import { urlFromCode } from './mapper-utils'

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

export async function checkTextboxesDirect(t: TestController, txts: string[], nth: number = 0): Promise<void> {
    for (const txt of txts) {
        const checkbox = Selector('div.checkbox-setting:not([inert] *)')
        // filter for label
            .filter(node => node.querySelector('label')!.innerText === txt, { txt })
        // get nth
            .nth(nth)
        // find checkbox
            .find('input')
        await t.click(checkbox)
    }
}
export async function checkTextboxes(t: TestController, txts: string[]): Promise<void> {
    await withHamburgerMenu(t, async () => {
        await checkTextboxesDirect(t, txts)
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

export async function waitForQuizLoading(t: TestController): Promise<void> {
    // Wait for various components that need to load
    while (await Selector(`[data-test-loading-quiz=true]`).exists) {
        // this really shouldn't take that long to load, a few extra checks should be fine
        await t.wait(100)
    }
}

export async function waitForLoading(): Promise<void> {
    return ClientFunction(() => (window as unknown as TestWindow).testUtils.waitForLoading())()
}

async function prepForImage(t: TestController, options: { hover: boolean }): Promise<void> {
    if (options.hover) {
        await t.hover('#searchbox') // Ensure the mouse pointer isn't hovering over any elements that change appearance when hovered over
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
}

let screenshotNumber = 0

function screenshotPath(t: TestController): string {
    screenshotNumber++
    return `${t.browser.name}/${t.test.name}-${screenshotNumber}.png`
}

type ScreencapOptions = { wait?: boolean, fullPage?: boolean } & ({ selector?: undefined } | ({ selector?: Selector } & TakeElementScreenshotOptions))

export async function screencap(t: TestController, { fullPage = true, wait = true, selector, ...options }: ScreencapOptions = {}): Promise<void> {
    if (wait) {
        await waitForLoading()
    }
    await prepForImage(t, { hover: fullPage })
    if (selector !== undefined) {
        await t.takeElementScreenshot(selector, screenshotPath(t), options)
    }
    else {
        await t.takeScreenshot({
            path: screenshotPath(t),
            fullPage,
        })
    }
}

export async function grabDownload(t: TestController, button: Selector, suffix: string): Promise<void> {
    const laterThan = new Date().getTime()
    await t.click(button)
    await copyMostRecentFile(t, laterThan, suffix)
}

export async function downloadImage(t: TestController): Promise<void> {
    const download = Selector('img').withAttribute('src', '/screenshot.png')
    await grabDownload(t, download, '.png')
}

export async function downloadHistogram(t: TestController, nth: number): Promise<void> {
    const download = Selector('img').withAttribute('src', '/download.png').nth(nth)
    await grabDownload(t, download, '.png')
}

export async function downloadCSV(t: TestController): Promise<string> {
    const laterThan = Date.now()
    const csvButton = Selector('img').withAttribute('src', '/csv.png')
    await t.click(csvButton)

    const downloadedFilePath = await waitForDownload(t, laterThan, '.csv')
    const csvContent = fs.readFileSync(downloadedFilePath, 'utf-8')
    return csvContent
}

function mostRecentDownload(suffix: string): { path: string, mtime: number } | undefined {
    // get the most recent file in the downloads folder
    const files = fs.readdirSync(downloadsFolder())
    const sorted = files
        .filter(x => !x.startsWith('.') && !x.endsWith('.crdownload') && x.endsWith(suffix))
        .map(x => path.join(downloadsFolder(), x))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    if (sorted.length === 0) {
        return undefined
    }
    const latest = sorted[0]
    const mtime = fs.statSync(latest).mtimeMs
    return { path: latest, mtime }
}

export async function waitForDownload(t: TestController, laterThan: number, suffix: string): Promise<string> {
    while (true) {
        const download = mostRecentDownload(suffix)
        if (download !== undefined && download.mtime > laterThan) {
            return download.path
        }
        console.warn(chalkTemplate`{yellow No file found in downloads folder, waiting for download to complete}`)
        // wait for the download to finish
        await t.wait(100)
    }
}

async function copyMostRecentFile(t: TestController, laterThan: number, suffix: string): Promise<void> {
    // copy the file to the screenshots folder
    // @ts-expect-error -- TestCafe doesn't have a public API for the screenshots folder
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- TestCafe doesn't have a public API for the screenshots folder
    const screenshotsFolder: string = t.testRun.opts.screenshots.path ?? (() => { throw new Error() })()
    const mrdp = await waitForDownload(t, laterThan, suffix)
    const dest = path.join(screenshotsFolder, screenshotPath(t))
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(mrdp, dest)
}

export async function downloadOrCheckString(t: TestController, string: string, name: string, format: 'json' | 'xml' | 'txt' | 'csv', gzip = true): Promise<void> {
    const pathToFile = path.join(__dirname, '..', '..', 'tests', 'reference_strings', `${name}.${format}${gzip ? '.gz' : ''}`)

    switch (format) {
        case 'json':
            string = JSON.stringify(JSON.parse(string), null, 2)
            break
        case 'xml':
            string = xmlFormat(string)
            break
        case 'txt':
            break
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- We might want to change this variable
    if (checkString) {
        let expectedBuf: Buffer = fs.readFileSync(pathToFile)
        if (gzip) {
            expectedBuf = gunzipSync(expectedBuf)
        }
        const expected = expectedBuf.toString('utf-8')
        if (string !== expected) {
            if (gzip) {
                // Using this because these strings are massive and the diff generation times out
                await t.expect(false).ok(`String does not match expected value`)
            }
            else {
                await t.expect(string).eql(expected)
            }
        }
    }
    else {
        fs.writeFileSync(pathToFile, gzip ? gzipSync(string) : string)
        fs.utimesSync(pathToFile, 0, 0)
    }
}

export async function safeClearLocalStorage(t: TestController): Promise<void> {
    await flaky(t, () =>
        ClientFunction(() => {
            (window as unknown as TestWindow).testUtils.safeClearLocalStorage()
        })(),
    )
}

const consoleEnabled = new WeakSet()
let failTestConsoleMessages: string[] = []

async function printConsoleMessages(t: TestController): Promise<void> {
    const cdp = await t.getCurrentCDPSession()
    if (consoleEnabled.has(cdp)) {
        return
    }
    consoleEnabled.add(cdp)
    cdp.Console.on('messageAdded', (event) => {
        const timestamp = new Date().toISOString()
        if (event.message.text.includes('[failtest]')) {
            failTestConsoleMessages.push(event.message.text)
        }
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

async function throwIfTestFailFromConsole(t: TestController): Promise<void> {
    try {
        await t.expect(failTestConsoleMessages).eql([])
    }
    finally {
        failTestConsoleMessages = []
    }
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

export function urbanstatsFixture(name: string, url: string, beforeEach?: (t: TestController) => Promise<void>, { afterEach, requestHooks = [] }: {
    afterEach?: (t: TestController) => Promise<void>
    requestHooks?: object[]
} = {}): void {
    if (url.startsWith('/')) {
        url = target + url
    }
    else {
        // assert url starts with TARGET
        if (!url.startsWith(target)) {
            throw new Error(`URL ${url} does not start with ${target}`)
        }
    }
    fixture(name)
        .page(url)
        .beforeEach(async (t) => {
            await printConsoleMessages(t)
            await printFailedNetworkRequests(t)
            screenshotNumber = 0
            await safeClearLocalStorage(t)
            await t.resizeWindow(1400, 800)
            await beforeEach?.(t)
        }).skipJsErrors({ pageUrl: /google\.com/ }).afterEach(async (t) => {
            await throwIfTestFailFromConsole(t)
            await afterEach?.(t)
        }).requestHooks(requestHooks)
}

export async function flaky<T>(t: TestController, doThing: () => Promise<T>): Promise<T> {
    const start = Date.now()
    while (true) {
        try {
            return await doThing()
        }
        catch (error) {
            console.error(chalkTemplate`{red flaky failed with error}`, error)
            await t.takeScreenshot({
                path: `${t.browser.name}/${t.test.name}.flaky.error.png`,
                fullPage: true,
            })
            if (Date.now() > start + 30 * 1000) {
                console.error(chalkTemplate`{red flaky timed out}`)
                throw error
            }
        }
    }
}

export async function arrayFromSelector(selector: Selector): Promise<Selector[]> {
    return Array.from({ length: await selector.count }, (_, n) => selector.nth(n))
}

export function pageDescriptorKind(): Promise<string | undefined> {
    return Selector('#pageState_current_descriptor_kind').value
}

export async function safeReload(t: TestController): Promise<void> {
    // eslint-disable-next-line no-restricted-syntax -- This is the utility that replaces location.reload()
    await t.eval(() => setTimeout(() => { location.reload() }, 0))
    await flaky(t, async () => {
        await waitForLoading() // This is flaky since the page can unload while it's running
    })
}

export const openInNewTabModifiers = process.platform === 'darwin' ? { meta: true } : { ctrl: true }

export async function waitForSelectedSearchResult(t: TestController): Promise<string> {
    await waitForLoading()
    const selectedSearchResult = Selector('[data-test-id=selected-search-result]')
    await t.expect(selectedSearchResult.exists).ok()
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

export function mapFeatureName(r: RegExp): Promise<string | undefined> {
    return ClientFunction(() => {
        for (const { features } of (window as unknown as TestWindow).testUtils.clickableMaps.values()) {
            for (const feature of features) {
                if (r.test(feature)) {
                    return feature
                }
            }
        }
        return
    }, { dependencies: { r } })()
}

export async function clickMapFeature(r: RegExp): Promise<void> {
    return ClientFunction(() => {
        for (const { features, clickFeature } of (window as unknown as TestWindow).testUtils.clickableMaps.values()) {
            for (const feature of features) {
                if (r.test(feature)) {
                    clickFeature(feature)
                    return
                }
            }
        }
        throw new Error(`No feature clicked, none matching ${r}`)
    }, { dependencies: { r } })()
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
    await flaky(t, async () => { // Universe flag sometimes isn't loaded
        await t.click(
            Selector('img')
                .withAttribute('class', 'universe-selector-option')
                .withAttribute('alt', alt))
    })
}

// Gets the non-extension part of the test file, e.g. if running search.test.ts -> search
export function getCurrentTest(t: TestController): string {
    // @ts-expect-error -- TestCafe private API
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- TestCafe private API
    const testFileName: string = t.testRun.test.testFile.filename
    return /([^/]+)\.test\.ts$/.exec(testFileName)![1]
}

export const mapper = (testFn: () => TestFn) => (
    name: string,
    { code, geo = 'Urban Center', universe = 'Iceland' }: { code: string, geo?: string, universe?: string },
    testBlock: (t: TestController) => Promise<void>,
): void => {
    // use Iceland and Urban Center as a quick test (less data to load)
    urbanstatsFixture(`quick-${code}`, urlFromCode(geo, universe, code))
    testFn()(name, testBlock)
}

export const goBack = ClientFunction(() => { window.history.back() })
export const goForward = ClientFunction(() => { window.history.forward() })
export const getScroll = ClientFunction(() => window.scrollY)
