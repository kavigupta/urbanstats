import { exec } from 'child_process'
import { writeFileSync } from 'fs'
import { promisify } from 'util'

import { execa, execaSync } from 'execa'
import { ClientFunction, Selector } from 'testcafe'

import { safeReload, screencap, urbanstatsFixture } from './test_utils'

export async function quizScreencap(t: TestController): Promise<void> {
    await t.eval(() => {
        const elem = document.getElementById('quiz-timer')
        if (elem) {
            elem.remove()
        }
    })
    await t.wait(1000)
    await screencap(t)
}

export async function clickButtons(t: TestController, whichs: string[]): Promise<void> {
    for (const which of whichs) {
        await clickButton(t, which)
        await t.wait(500)
    }
    await t.wait(2000)
}
// click the kth button with id quiz-answer-button-$which

export function clickButton(t: TestController, which: string): TestControllerPromise {
    return t.click(Selector('div').withAttribute('id', `quiz-answer-button-${which}`))
}

let server: Promise<unknown> | undefined
async function runForTest(): Promise<void> {
    if (server === undefined) {
        server = execa('bash', ['../urbanstats-persistent-data/run_for_test.sh'], { stdio: 'inherit', cleanup: true })
        process.on('exit', () => {
            execaSync('pkill', ['-f', 'urbanstats-persistent-data'])
        })
        await waitForServerToBeAvailable()
    }
}

async function waitForServerToBeAvailable(): Promise<void> {
    while (true) {
        try {
            await fetch('http://localhost:54579')
            break
        }
        catch {}
        await new Promise(resolve => setTimeout(resolve, 100))
    }
}

export function quizFixture(fixName: string, url: string, newLocalstorage: Record<string, string>, sqlStatements: string, platform: 'desktop' | 'mobile'): void {
    urbanstatsFixture(fixName, url, async (t) => {
        await interceptRequests(t)
        // delete the database. it will be automatically recreated
        await promisify(exec)(`cd ../urbanstats-persistent-data; rm db.sqlite3; cd -`)
        await runForTest()
        await t.eval(() => {
            localStorage.clear()
            for (const k of Object.keys(newLocalstorage)) {
                localStorage.setItem(k, newLocalstorage[k])
            }
        }, { dependencies: { newLocalstorage } })
        await t.eval(() => {
            localStorage.setItem('testHostname', 'urbanstats.org')
        })
        // Must reload after setting localstorage so page picks it up
        await safeReload(t)
        switch (platform) {
            case 'mobile':
                await t.resizeWindow(400, 800)
                break
            case 'desktop':
                await t.resizeWindow(1400, 800)
                break
        }
    })
}

const interceptingSessions = new Set<unknown>()

async function interceptRequests(t: TestController): Promise<void> {
    const cdpSesh = await t.getCurrentCDPSession()
    if (interceptingSessions.has(cdpSesh)) {
        return
    }
    else {
        interceptingSessions.add(cdpSesh)
    }
    cdpSesh.Fetch.on('requestPaused', async (event) => {
        try {
            if (event.responseStatusCode !== undefined) {
                // This is a response, just send it back
                await cdpSesh.Fetch.continueResponse({ requestId: event.requestId })
            }
            else if (event.request.url.startsWith('https://s.urbanstats.org/s?')) {
                // We're doing a GET from the link shortener, send the request to the local persistent, and override the location to go to localhost instead of urbanstats.org
                // Chrome doesn't support overriding the response later, so we must fulfill the request by making a fetch
                const response = await fetch(event.request.url.replaceAll('https://s.urbanstats.org', 'http://localhost:54579'), {
                    ...event.request,
                    redirect: 'manual',
                })
                const responseHeaders: { name: string, value: string }[] = []
                response.headers.forEach((value, name) => {
                    if (name === 'location') {
                        responseHeaders.push({
                            name,
                            value: value.replaceAll('https://urbanstats.org', 'http://localhost:8000'),
                        })
                    }
                    else {
                        responseHeaders.push({ name, value })
                    }
                })
                await cdpSesh.Fetch.fulfillRequest({ requestId: event.requestId, responseHeaders, responseCode: response.status })
            }
            else {
                // We're using the persistent backend in some other way, send the request to localhost
                await cdpSesh.Fetch.continueRequest({ requestId: event.requestId, url: event.request.url.replace(/https:\/\/.+\.urbanstats\.org/g, 'http://localhost:54579') })
            }
        }
        catch (e) {
            console.error(`Failure in CDP requestPaused handler: ${e}`)
        }
    })
    await cdpSesh.Fetch.enable({
        patterns: [{
            urlPattern: 'https://s.urbanstats.org/*',
        }, {
            urlPattern: 'https://persistent.urbanstats.org/*',
        }],
    })
}

export function tempfileName(): string {
    return `/tmp/quiz_test_${Math.floor(Math.random() * 1000000)}`
}

export async function withMockedClipboard(t: TestController, runner: () => Promise<void>): Promise<string[]> {
    await t.eval(() => {
        const mock: ((text: string) => Promise<void>) & { calls: string[] } = function (text: string) {
            mock.calls.push(text)
            return Promise.resolve()
        }
        mock.calls = []
        navigator.clipboard.writeText = mock
    })
    await runner()
    const calls = await t.eval(() => (navigator.clipboard.writeText as unknown as { calls: string[] }).calls) as string[]
    return calls
}

export const friendsText = ClientFunction<string[], []>(() => {
    const elements = document.getElementsByClassName('testing-friends-section')
    const results: string[] = []
    // eslint-disable-next-line @typescript-eslint/prefer-for-of -- No need to convert to array
    for (let i = 0; i < elements.length; i++) {
        results.push(elements[i].textContent!)
    }
    return results
})
