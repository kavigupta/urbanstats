import { exec } from 'child_process'
import { writeFileSync } from 'fs'
import { promisify } from 'util'

import { execa } from 'execa'
import { RequestHook, Selector } from 'testcafe'

import { safeReload, screencap, urbanstatsFixture } from './test_utils'

export async function quiz_screencap(t: TestController): Promise<void> {
    await t.eval(() => {
        const elem = document.getElementById('quiz-timer')
        if (elem) {
            elem.remove()
        }
    })
    await t.wait(1000)
    await screencap(t)
}

export async function click_buttons(t: TestController, whichs: string[]): Promise<void> {
    for (const which of whichs) {
        await click_button(t, which)
        await t.wait(500)
    }
    await t.wait(2000)
}
// click the kth button with id quiz-answer-button-$which

export function click_button(t: TestController, which: string): TestControllerPromise {
    return t.click(Selector('div').withAttribute('id', `quiz-answer-button-${which}`))
}
export function quiz_fixture(fix_name: string, url: string, new_localstorage: Record<string, string>, sql_statements: string): void {
    urbanstatsFixture(fix_name, url, async (t) => {
        // create a temporary file
        const tempfile = `${tempfile_name()}.sql`
        // write the sql statements to the temporary file
        writeFileSync(tempfile, sql_statements)
        await promisify(exec)(`rm -f ../urbanstats-persistent-data/db.sqlite3; cd ../urbanstats-persistent-data; cat ${tempfile} | sqlite3 db.sqlite3; cd -`)
        void execa('bash', ['../urbanstats-persistent-data/run_for_test.sh'], { stdio: 'inherit' })
        await t.wait(2000)
        await t.eval(() => {
            localStorage.clear()
            for (const k of Object.keys(new_localstorage)) {
                localStorage.setItem(k, new_localstorage[k])
            }
        }, { dependencies: { new_localstorage } })
        await t.eval(() => {
            localStorage.setItem('testHostname', 'urbanstats.org')
        })
        // Must reload after setting localstorage so page picks it up
        await safeReload(t)
    })
        .afterEach(async (t) => {
            exec('killall gunicorn')
            await t.wait(1000)
        })
        .requestHooks(new ProxyPersistent())
}
export class ProxyPersistent extends RequestHook {
    override onRequest(e: { requestOptions: RequestMockOptions }): void {
        if (e.requestOptions.hostname === 'persistent.urbanstats.org') {
            e.requestOptions.hostname = 'localhost'
            e.requestOptions.port = 54579
            e.requestOptions.protocol = 'http:'
            e.requestOptions.path = e.requestOptions.path.replace('https://persistent.urbanstats.org', 'localhost:54579')
            e.requestOptions.host = 'localhost:54579'
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- TestCafe complains if we don't have this
    override onResponse(): void { }
}

export function tempfile_name(): string {
    return `/tmp/quiz_test_${Math.floor(Math.random() * 1000000)}`
}