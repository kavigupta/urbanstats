import fs from 'fs/promises'
import os from 'os'
import path from 'path'

import { execa, ExecaChildProcess } from 'execa'
import { ClientFunction, Selector } from 'testcafe'

import { freePort } from './scripts/run-e2e-tests-docker'
import { getLocation, target, urbanstatsFixture } from './test_utils'

// The git endpoints and a local run's snapshots are served by the dev server, which CI doesn't
// otherwise run. Its own output path keeps it from overwriting the scripts of a dev server that's
// already running.

// From before "String comparisons" (#2489), which adds references, through "Rename the US Census
// source to National Census" (#2546), which modifies them. Removing a flaky test (#2496) deletes one.
const base = '44d49491777ce774894cde06c2ee517a4bfc6fb2'
const head = '8c062719de55217ad619d1096de5e93fd040a41c'

// The local run takes base's references as its references, and head's as what it produced
const runTests = ['statistics', 'infinite-statval']

let devServer: ExecaChildProcess | undefined
let tempDir: string
let devServerUrl: string

function viewer(params: Record<string, string>): string {
    return `${devServerUrl}/snapshot-diff-viewer.html?${new URLSearchParams(params).toString()}`
}

async function extractReferences(ref: string, dest: string): Promise<void> {
    const present = (await execa('git', ['ls-tree', '--name-only', ref, ...runTests.map(test => `reference_test_snapshots/${test}`)], { cwd: '..' })).stdout.split('\n')
    await fs.mkdir(dest, { recursive: true })
    await execa('bash', ['-c', 'git archive "$0" "${@:2}" | tar -x --strip-components=1 -C "$1"', ref, dest, ...present], { cwd: '..' })
}

urbanstatsFixture('snapshot diff viewer', '/index.html')
    .before(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'snapshot-diff-viewer-'))
        const siteDir = path.join(tempDir, 'site')
        const runRoot = path.join(tempDir, 'run')

        await extractReferences(base, path.join(runRoot, 'reference_test_snapshots'))
        await extractReferences(head, path.join(runRoot, 'react', 'test_snapshots'))
        // In a process of its own, since the comparison works relative to the current directory
        const scripts = path.resolve('test/scripts')
        await execa(process.execPath, [require.resolve('tsx/cli'), '--eval', `(async () => {
            const { checkSnapshots } = await import(${JSON.stringify(`${scripts}/check-snapshots.ts`)})
            const { writeChangedSnapshotsManifest } = await import(${JSON.stringify(`${scripts}/util.ts`)})
            for (const test of ${JSON.stringify(runTests)}) {
                await checkSnapshots(test)
                await writeChangedSnapshotsManifest(test)
            }
        })()`], { cwd: path.join(runRoot, 'react') })

        await fs.mkdir(siteDir)
        await fs.writeFile(path.join(siteDir, 'snapshot-diff-viewer.html'), await (await fetch(`${target}/snapshot-diff-viewer.html`)).text())
        const port = await freePort()
        devServerUrl = `http://localhost:${port}`
        devServer = execa('npx', ['rspack', 'serve', '--mode=development', '--env', `directory=${siteDir}`, '--env', `snapshotsRoot=${runRoot}`, '--output-path', path.join(siteDir, 'scripts')], {
            env: { PORT: port.toString(), NODE_ENV: 'development' },
            stdio: 'ignore',
            cleanup: true,
        })
        const deadline = Date.now() + 5 * 60 * 1000
        while (!await fetch(`${devServerUrl}/scripts/index.js`).then(response => response.ok, () => false)) {
            if (Date.now() > deadline) {
                throw new Error('Dev server did not start')
            }
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    })
    .after(async () => {
        devServer?.kill()
        await fs.rm(tempDir, { recursive: true, force: true })
    })

const header = Selector('h2')

test('lists every changed reference', async (t) => {
    await t.navigateTo(viewer({ base, head }))
    await t.expect(header.textContent).match(/^\(1 \/ 217\) /)
})

const magentaIndicatorRows = ClientFunction(() => {
    const img = document.querySelectorAll<HTMLImageElement>('.container img')[1]
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(img, 0, 0)
    const column = context.getImageData(img.naturalWidth - 50, 0, 1, img.naturalHeight).data
    let rows = 0
    for (let i = 0; i < column.length; i += 4) {
        if (column[i] === 255 && column[i + 1] === 0 && column[i + 2] === 255) {
            rows++
        }
    }
    return rows
})

test('shows a modified image beside its delta', async (t) => {
    await t.navigateTo(viewer({ base, head, tests: 'statistics' }))
    await t.expect(header.textContent).eql('(1 / 31) statistics / add columns starting from a statname-1.png')
    await t.expect(Selector('.container img').count).eql(3)
    await t.expect(magentaIndicatorRows()).gt(0)
})

test('diffs text', async (t) => {
    await t.navigateTo(viewer({ base, head, tests: 'statistics', index: '5' }))
    await t.expect(header.textContent).eql('(6 / 31) statistics / csv-export-population-statistics.csv')
    await t.expect(Selector('.diff-removed').withExactText('-"Name","Population [US Census]","Population [US Census] Ord","Population [US Census] percentile"').exists).ok()
    await t.expect(Selector('.diff-added').withExactText('+"Name","Population [National Census]","Population [National Census] Ord","Population [National Census] percentile"').exists).ok()
})

test('diffs gzipped text', async (t) => {
    await t.navigateTo(viewer({ base, head, tests: 'mapper_x1' }))
    await t.expect(header.textContent).eql('(1 / 1) mapper_x1 / mapping-geojson-negative-default-value.json.gz')
    await t.expect(Selector('pre.snapshot-text').withText(/^reference and actual agree on the first \d+ and last \d+ lines\./).exists).ok()
})

test('shows added and deleted files', async (t) => {
    await t.navigateTo(viewer({ base, head, tests: 'infinite-statval' }))
    await t.expect(Selector('h1').withExactText('New File').exists).ok()
    await t.navigateTo(viewer({ base, head, tests: 'mapper-ux_x1' }))
    await t.expect(header.textContent).eql('(1 / 1) mapper-ux_x1 / mobile appearance-1.png')
    await t.expect(Selector('h1').withExactText('Deleted File').exists).ok()
    await t.expect(Selector('.container img').count).eql(1)
})

test('navigates with the buttons and arrow keys', async (t) => {
    await t.navigateTo(viewer({ base, head, tests: 'infinite-statval' }))
    await t.click(Selector('button').withExactText('Forward →'))
    await t.expect(header.textContent).eql('(2 / 2) infinite-statval / an unbounded value is written as an infinity, not as a missing one-1.png')
    await t.expect(getLocation()).contains(`base=${base}`)
    await t.expect(getLocation()).contains('index=1')
    await t.pressKey('left')
    await t.expect(header.textContent).eql('(1 / 2) infinite-statval / an unbounded value below zero keeps its sign-1.png')
    await t.expect(Selector('button').withExactText('← Back').hasAttribute('disabled')).ok()
})

test('shows a bad ref rather than loading forever', async (t) => {
    await t.navigateTo(viewer({ base: 'no-such-ref' }))
    await t.expect(Selector('pre').withText(/bad revision 'no-such-ref'/).exists).ok()
})

test('reads a local run', async (t) => {
    await t.navigateTo(viewer({ tests: runTests.join(',') }))
    await t.expect(header.textContent).match(/^\(1 \/ \d+\) statistics \/ add columns starting from a statname-1\.png$/)
    await t.expect(Selector('.container img').count).eql(3)
    await t.expect(magentaIndicatorRows()).gt(0)
})

test('reads a local run\'s text diff', async (t) => {
    await t.navigateTo(viewer({ tests: 'statistics', index: '5' }))
    await t.expect(header.textContent).match(/ statistics \/ csv-export-population-statistics\.csv$/)
    await t.expect(Selector('.diff-added').withExactText('+"Name","Population [National Census]","Population [National Census] Ord","Population [National Census] percentile"').exists).ok()
})

test('reads a local run\'s new files', async (t) => {
    await t.navigateTo(viewer({ tests: 'infinite-statval' }))
    await t.expect(header.textContent).eql('(1 / 2) infinite-statval / an unbounded value below zero keeps its sign-1.png')
    await t.expect(Selector('h1').withExactText('New File').exists).ok()
    await t.expect(Selector('.container img').count).eql(1)
})

test('has nothing to show for a test the run didn\'t change', async (t) => {
    await t.navigateTo(viewer({ tests: 'article_x0' }))
    await t.expect(Selector('h1').withExactText('No Entries').exists).ok()
})
