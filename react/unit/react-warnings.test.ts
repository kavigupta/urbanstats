import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { createElement, Fragment, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { reifyReact } from '../src/utils/human-readable-name'
import { storedUnits } from '../src/utils/unit'

/**
 * Renders and returns what React complained about while doing it. Its warnings only reach
 * console.error, and only in the development build, which is what the unit tests run.
 */
function warningsWhileRendering(node: ReactNode): string[] {
    const warnings: string[] = []
    const wasError = console.error
    console.error = (...args: unknown[]) => { warnings.push(String(args[0])) }
    try {
        renderToStaticMarkup(createElement(Fragment, null, node))
    }
    finally {
        console.error = wasError
    }
    return warnings
}

void describe('rendering a name', () => {
    void test('leaves React with nothing to complain about', () => {
        const name = [
            { type: 'atom' as const, value: 'max(Mean high temp, ' },
            { type: 'quantity' as const, value: 80, unit: storedUnits.temperature },
            { type: 'atom' as const, value: ')' },
            { type: 'parens' as const, value: [{ type: 'atom' as const, value: 'in' }] },
            { type: 'superscript' as const, value: [{ type: 'atom' as const, value: '2' }] },
        ]
        assert.deepEqual(warningsWhileRendering(reifyReact(name, {})), [])
    })
})
