import assert from 'assert/strict'
import { readFileSync } from 'fs'
import { test } from 'node:test'

import { parse } from 'smol-toml'
import ts from 'typescript'

// Lazily loaded modules the Worker renders with
const bundled = ['../mapper/settings/utils', '../stat/utils']

function dynamicImports(path: string): Set<string> {
    const imports = new Set<string>()
    const visit = (node: ts.Node): void => {
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
            const [specifier] = node.arguments
            assert(ts.isStringLiteral(specifier), `Non-literal import() in ${path}`)
            imports.add(specifier.text)
        }
        ts.forEachChild(node, visit)
    }
    visit(ts.createSourceFile(path, readFileSync(path, 'utf-8'), ts.ScriptTarget.Latest))
    return imports
}

void test('the embed Worker stubs every lazily loaded page module', () => {
    const { alias } = parse(readFileSync('cf-og-worker/wrangler.toml', 'utf-8'))

    assert.deepEqual(new Set([...Object.keys(alias), ...bundled]), dynamicImports('src/navigation/PageDescriptor.ts'))
})
