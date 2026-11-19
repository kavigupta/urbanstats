import assert from 'assert/strict'
import { readFileSync } from 'fs'
import { test } from 'node:test'

import { parse } from 'smol-toml'

// Lazily loaded modules the Worker renders with
const bundled = ['../mapper/settings/utils', '../stat/utils']

void test('the embed Worker stubs every lazily loaded page module', () => {
    const pageDescriptor = readFileSync('src/navigation/PageDescriptor.ts', 'utf-8')
    const imported = new Set(Array.from(pageDescriptor.matchAll(/import\('([^']+)'\)/g), match => match[1]))
    const { alias } = parse(readFileSync('cf-og-worker/wrangler.toml', 'utf-8'))

    assert.deepEqual(new Set([...Object.keys(alias), ...bundled]), imported)
})
