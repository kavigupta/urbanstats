import { exec } from 'child_process'
import { writeFileSync } from 'fs'
import { promisify } from 'util'

import { execa, execaSync } from 'execa'
import { RequestHook, Selector } from 'testcafe'

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

export function quizFixture(fixName: string, url: string, newLocalstorage: Record<string, string>, sqlStatements: string): void {
    urbanstatsFixture(fixName, url, async (t) => {
        const tempfile = `${tempfileName()}.sql`
        // Drop the database (https://stackoverflow.com/a/65743498/724702) then execute teh statements
        writeFileSync(tempfile, `PRAGMA writable_schema = 1;
DELETE FROM sqlite_master;
PRAGMA writable_schema = 0;
VACUUM;
PRAGMA integrity_check;
${sqlStatements}`)
        await promisify(exec)(`cd ../urbanstats-persistent-data; cat ${tempfile} | sqlite3 db.sqlite3; cd -`)
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
    })
        .requestHooks(new ProxyPersistent())
}
export class ProxyPersistent extends RequestHook {
    override onRequest(e: { requestOptions: RequestMockOptions }): void {
        if (e.requestOptions.hostname === 'persistent.urbanstats.org') {
            e.requestOptions.hostname = 'localhost'
            e.requestOptions.port = 54579
            e.requestOptions.protocol = 'http:'
            e.requestOptions.path = e.requestOptions.path.replaceAll('https://persistent.urbanstats.org', 'localhost:54579')
            e.requestOptions.host = 'localhost:54579'
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- TestCafe complains if we don't have this
    override onResponse(): void { }
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
