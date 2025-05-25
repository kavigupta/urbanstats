import assert from 'assert/strict'
import { test } from 'node:test'

import { lex } from '../src/urban-stats-script/lexer'
import { parse, toSExp } from '../src/urban-stats-script/parser'

void test('basic lexing with indices', (): void => {
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

void test('various lexes', (): void => {
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
    assert.deepStrictEqual(shortFormLex('x = 2; x = 3'), [
        'x',
        '=',
        2,
        ';',
        'x',
        '=',
        3,
        ['EOL', ''],
    ])
    assert.deepStrictEqual(shortFormLex('f(f(x))'), [
        'f',
        '(',
        'f',
        '(',
        'x',
        ')',
        ')',
        ['EOL', ''],
    ])
    assert.deepStrictEqual(shortFormLex('x(y, z=f(x))'), [
        'x',
        '(',
        'y',
        ',',
        'z',
        '=',
        'f',
        '(',
        'x',
        ')',
        ')',
        ['EOL', ''],
    ])
})

function parseAndRender(input: string): string[] {
    const res = parse(lex(input))
    if (res.type === 'error') {
        return [`(error ${res.message})`]
    }
    return res.result.map(toSExp)
}

void test('basic parsing', (): void => {
    assert.deepStrictEqual(
        parse(lex('x = 2')),
        {
            type: 'statements',
            result: [
                {
                    type: 'assignment',
                    lhs: { type: 'identifier', name: { node: 'x', location: { lineIdx: 0, startIdx: 0, endIdx: 1 } } },
                    value: { type: 'constant', value: { node: 2, location: { lineIdx: 0, startIdx: 4, endIdx: 5 } } },
                },
            ],
        },
    )
    assert.deepStrictEqual(
        parseAndRender('x = 2; y = x'),
        [
            '(assign (id x) (const 2))',
            '(assign (id y) (id x))',
        ],
    )
    assert.deepStrictEqual(
        parseAndRender('x'),
        [
            '(expr (id x))',
        ],
    )
    assert.deepStrictEqual(
        parseAndRender('abc()'),
        [
            '(expr (fn (id abc)))',
        ],
    )
    assert.deepStrictEqual(
        parseAndRender('x(y)'),
        [
            '(expr (fn (id x) (id y)))',
        ],
    )
    assert.deepStrictEqual(
        parseAndRender('x(y, z)'),
        [
            '(expr (fn (id x) (id y) (id z)))',
        ],
    )
    assert.deepStrictEqual(
        parseAndRender('x(y, z=2)'),
        [
            '(expr (fn (id x) (id y) (named z (const 2))))',
        ],
    )
    assert.deepStrictEqual(
        parseAndRender('x(y, z=2, y)'),
        [
            '(expr (fn (id x) (id y) (named z (const 2)) (id y)))',
        ],
    )
    assert.deepStrictEqual(
        parseAndRender('x(y, f())'),
        [
            '(expr (fn (id x) (id y) (fn (id f))))',
        ],
    )
    assert.deepStrictEqual(
        parseAndRender('x(y)(z)'),
        [
            '(expr (fn (fn (id x) (id y)) (id z)))',
        ],
    )
    assert.deepStrictEqual(
        parseAndRender('x + y + z'),
        [
            '(expr (infix (+ +) ((id x) (id y) (id z))))',
        ],
    )
    assert.deepStrictEqual(
        parseAndRender('regr = linear_regression(y=commute_transit, x0=commute_car, weight=population)'),
        [
            '(assign (id regr) (fn (id linear_regression) (named y (id commute_transit)) (named x0 (id commute_car)) (named weight (id population))))',
        ],
    )
    assert.deepStrictEqual(
        parseAndRender('if (x > 2) { y = 3 } else { y = 4 }'),
        [
            '(if (infix (>) ((id x) (const 2))) (assign (id y) (const 3)) (assign (id y) (const 4)))',
        ],
    )
})

const multiRegression = `
if (pw_density_1km < 1000) {
    regr = linear_regression(y=commute_transit, x0=commute_car, weight=population)
} else {
    regr = linear_regression(y=commute_transit, x0=commute_car, weight=population, allow_intercept=false)
}
regr.w0 = regr.w0 * 2; regr.w0
`
