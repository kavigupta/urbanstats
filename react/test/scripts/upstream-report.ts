import fs from 'fs/promises'

import { describeUpstream, loadAndMergeTestHistories, resultDuration, sumUpstream } from './util'

const history = await loadAndMergeTestHistories()

const rows = history
    .map(({ test, result, upstream }) => ({ test, duration: resultDuration(result), upstream }))
    .filter(row => row.upstream !== undefined)
    .sort((a, b) => b.upstream!.busyMs - a.upstream!.busyMs)

const total = sumUpstream(rows.map(row => row.upstream))
const totalDuration = rows.reduce((sum, { duration }) => sum + duration, 0)

const lines = [
    '| test | test s | upstream busy s | share | requests | MB |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map(({ test, duration, upstream }) => [
        test,
        (duration / 1000).toFixed(0),
        (upstream!.busyMs / 1000).toFixed(0),
        `${(100 * upstream!.busyMs / duration).toFixed(0)}%`,
        upstream!.requests,
        (upstream!.bytes / 1e6).toFixed(0),
    ].join(' | ')).map(row => `| ${row} |`),
    '',
    `**Total: ${describeUpstream(total, totalDuration)}**`,
]

console.warn(lines.join('\n'))

if (process.env.GITHUB_STEP_SUMMARY !== undefined) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`)
}
