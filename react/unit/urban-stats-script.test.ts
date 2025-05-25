import assert from 'assert/strict'
import { test } from 'node:test'

import { lex } from '../src/urban-stats-script/lexer'

void test('basic lexing with indices', (): Promise<void> => {
    assert.deepStrictEqual(lex('1 23 3.3'), [
        { token: { type: 'number', value: 1 }, location: { lineIdx: 0, startIdx: 0, endIdx: 1 } },
        { token: { type: 'number', value: 23 }, location: { lineIdx: 0, startIdx: 2, endIdx: 4 } },
        { token: { type: 'number', value: 3.3 }, location: { lineIdx: 0, startIdx: 5, endIdx: 8 } },
        { token: { type: 'operator', value: 'EOL' }, location: { lineIdx: 0, startIdx: 8, endIdx: 8 } },
    ])
    assert.deepStrictEqual(lex('"abc"'), [
        { token: { type: 'string', value: 'abc' }, location: { lineIdx: 0, startIdx: 0, endIdx: 5 } },
        { token: { type: 'operator', value: 'EOL' }, location: { lineIdx: 0, startIdx: 5, endIdx: 5 } },
    ])
    assert.deepStrictEqual(lex('"abc\\""'), [
        { token: { type: 'string', value: 'abc"' }, location: { lineIdx: 0, startIdx: 0, endIdx: 7 } },
        { token: { type: 'operator', value: 'EOL' }, location: { lineIdx: 0, startIdx: 7, endIdx: 7 } },
    ])
    assert.deepStrictEqual(lex('f(2, "abc \\" 3.5")'), [
        { token: { type: 'identifier', value: 'f' }, location: { lineIdx: 0, startIdx: 0, endIdx: 1 } },
        { token: { type: 'bracket', value: '(' }, location: { lineIdx: 0, startIdx: 1, endIdx: 2 } },
        { token: { type: 'number', value: 2 }, location: { lineIdx: 0, startIdx: 2, endIdx: 3 } },
        { token: { type: 'operator', value: ',' }, location: { lineIdx: 0, startIdx: 3, endIdx: 4 } },
        { token: { type: 'string', value: 'abc " 3.5' }, location: { lineIdx: 0, startIdx: 5, endIdx: 17 } },
        { token: { type: 'bracket', value: ')' }, location: { lineIdx: 0, startIdx: 17, endIdx: 18 } },
        { token: { type: 'operator', value: 'EOL' }, location: { lineIdx: 0, startIdx: 18, endIdx: 18 } },
    ])
    return Promise.resolve()
})

function shortFormLex(input: string): (string | number | [string | number, string])[] {
    const lines = input.split('\n')
    const lexedTokens = lex(input)
    const result: (string | number | [string | number, string])[] = []
    for (const token of lexedTokens) {
        const original = lines[token.location.lineIdx].slice(token.location.startIdx, token.location.endIdx)
        const valueStr = token.token.value.toString()
        if (original !== valueStr) {
            result.push([token.token.value, original])
        }
        else {
            result.push(token.token.value)
        }
    }
    return result
}

void test('various lexes', (): Promise<void> => {
    assert.deepStrictEqual(shortFormLex('1 23 3.3'), [1, 23, 3.3, ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('"abc"'), [['abc', '"abc"'], ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('"abc\\""'), [['abc"', '"abc\\""'], ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('f(2, "abc \\" 3.5")'), ['f', '(', 2, ',', ['abc " 3.5', '"abc \\" 3.5"'], ')', ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('f(x) + g(2.34)'), ['f', '(', 'x', ')', '+', 'g', '(', 2.34, ')', ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('f(x) ++2'), ['f', '(', 'x', ')', ['Invalid operator: ++', '++'], 2, ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('pw_frac = (pw_density_2km / pw_density_500m) ** 2\ny = x ** 0.5'), [
        'pw_frac',
        '=',
        '(',
        'pw_density_2km',
        '/',
        'pw_density_500m',
        ')',
        '**',
        2,
        ['EOL', ''],
        'y',
        '=',
        'x',
        '**',
        0.5,
        ['EOL', ''],
    ])
    return Promise.resolve()
})
