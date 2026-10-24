import assert from 'assert/strict'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { test } from 'node:test'

const generated = ['protos.js', 'protos.d.ts', 'google-drive.d.ts', 'urbanstats-persistent-data.d.ts', 'dom-to-image-more.d.ts']

const index = readFileSync('src/utils/AGENTS.md', 'utf8')

// Lines look like "- `a.ts`, `b.ts`: does X with `someExport`."
const entries = index.split('\n').filter(line => line.startsWith('- ')).map((line) => {
    const [files, description] = line.split(/:(.*)/)
    return {
        files: [...files.matchAll(/`([^`]+)`/g)].map(match => match[1]),
        identifiers: [...description.matchAll(/`([A-Za-z_$][\w$]*)`/g)].map(match => match[1]),
    }
})

void test('every file in src/utils is in its AGENTS.md', () => {
    const missing = readdirSync('src/utils').filter(file => file !== 'AGENTS.md' && !generated.includes(file) && !index.includes(`\`${file}\``))
    assert.deepEqual(missing, [])
})

void test('every file in AGENTS.md exists', () => {
    const missing = entries.flatMap(entry => entry.files).filter(file => !existsSync(`src/utils/${file}`))
    assert.deepEqual(missing, [])
})

void test('every identifier in AGENTS.md is exported by its line\'s files', () => {
    const missing = entries.flatMap(({ files, identifiers }) => {
        const sources = files.map(file => readFileSync(`src/utils/${file}`, 'utf8')).join('\n')
        return identifiers
            .filter(identifier => !new RegExp(`export (async )?(function|const|class|interface|type) ${identifier}\\b`).test(sources))
            .map(identifier => `${files.join(', ')}: ${identifier}`)
    })
    assert.deepEqual(missing, [])
})
