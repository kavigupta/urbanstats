import assert from 'assert/strict'
import { test } from 'node:test'

import { lex } from '../src/urban-stats-script/lexer'
import { allIdentifiers, parse, toSExp } from '../src/urban-stats-script/parser'

void test('basic lexing with indices', (): void => {
    assert.deepStrictEqual(lex('1 23 3.3'), [
        { token: { type: 'number', value: 1 }, location: { start: { lineIdx: 0, colIdx: 0 }, end: { lineIdx: 0, colIdx: 1 } } },
        { token: { type: 'number', value: 23 }, location: { start: { lineIdx: 0, colIdx: 2 }, end: { lineIdx: 0, colIdx: 4 } } },
        { token: { type: 'number', value: 3.3 }, location: { start: { lineIdx: 0, colIdx: 5 }, end: { lineIdx: 0, colIdx: 8 } } },
        { token: { type: 'operator', value: 'EOL' }, location: { start: { lineIdx: 0, colIdx: 8 }, end: { lineIdx: 0, colIdx: 8 } } },
    ])
    assert.deepStrictEqual(lex('"abc"'), [
        { token: { type: 'string', value: 'abc' }, location: { start: { lineIdx: 0, colIdx: 0 }, end: { lineIdx: 0, colIdx: 5 } } },
        { token: { type: 'operator', value: 'EOL' }, location: { start: { lineIdx: 0, colIdx: 5 }, end: { lineIdx: 0, colIdx: 5 } } },
    ])
    assert.deepStrictEqual(lex('"abc\\""'), [
        { token: { type: 'string', value: 'abc"' }, location: { start: { lineIdx: 0, colIdx: 0 }, end: { lineIdx: 0, colIdx: 7 } } },
        { token: { type: 'operator', value: 'EOL' }, location: { start: { lineIdx: 0, colIdx: 7 }, end: { lineIdx: 0, colIdx: 7 } } },
    ])
    assert.deepStrictEqual(lex('f(2, "abc \\" 3.5")'), [
        { token: { type: 'identifier', value: 'f' }, location: { start: { lineIdx: 0, colIdx: 0 }, end: { lineIdx: 0, colIdx: 1 } } },
        { token: { type: 'bracket', value: '(' }, location: { start: { lineIdx: 0, colIdx: 1 }, end: { lineIdx: 0, colIdx: 2 } } },
        { token: { type: 'number', value: 2 }, location: { start: { lineIdx: 0, colIdx: 2 }, end: { lineIdx: 0, colIdx: 3 } } },
        { token: { type: 'operator', value: ',' }, location: { start: { lineIdx: 0, colIdx: 3 }, end: { lineIdx: 0, colIdx: 4 } } },
        { token: { type: 'string', value: 'abc " 3.5' }, location: { start: { lineIdx: 0, colIdx: 5 }, end: { lineIdx: 0, colIdx: 17 } } },
        { token: { type: 'bracket', value: ')' }, location: { start: { lineIdx: 0, colIdx: 17 }, end: { lineIdx: 0, colIdx: 18 } } },
        { token: { type: 'operator', value: 'EOL' }, location: { start: { lineIdx: 0, colIdx: 18 }, end: { lineIdx: 0, colIdx: 18 } } },
    ])
})

function shortFormLex(input: string): (string | number | [string | number, string])[] {
    const lines = input.split('\n')
    const lexedTokens = lex(input)
    const result: (string | number | [string | number, string])[] = []
    for (const token of lexedTokens) {
        if (token.location.start.lineIdx !== token.location.end.lineIdx) {
            throw new Error(`Unexpected multi-line token: ${JSON.stringify(token)}`)
        }
        const original = lines[token.location.start.lineIdx].slice(token.location.start.colIdx, token.location.end.colIdx)
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
    assert.deepStrictEqual(shortFormLex('$'), [
        ['Invalid operator: $', '$'],
        ['EOL', ''],
    ])
    assert.deepStrictEqual(shortFormLex('€'), [
        ['Unexpected character: €', '€'],
        ['EOL', ''],
    ])
    assert.deepStrictEqual(shortFormLex('x = "ab'), ['x', '=', ['Unterminated string', '"ab'], ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('x = "a\\c"'), [
        'x',
        '=',
        ['Invalid string: "a\\c": SyntaxError: Bad escaped character in JSON at position 3 (line 1 column 4)', '"a\\c"'],
        ['EOL', ''],
    ])
    assert.deepStrictEqual(shortFormLex('x = 1e-3 + 1e+7 + 1e4 + 1k + 3m'), [
        'x',
        '=',
        [1e-3, '1e-3'],
        '+',
        [1e7, '1e+7'],
        '+',
        [1e4, '1e4'],
        '+',
        [1e3, '1k'],
        '+',
        [3e6, '3m'],
        ['EOL', ''],
    ])
})

function parseAndRender(input: string): string {
    const res = parse(input)
    if (res.type === 'error') {
        const renderedErrors = res.errors.map(err => `(error ${JSON.stringify(err.message)} at ${err.location.start.lineIdx}:${err.location.start.colIdx})`)
        return `(errors ${renderedErrors.join(' ')})`
    }
    return toSExp(res)
}

const multiRegression = `
if (pw_density_1km < 1000) {
    regr = linear_regression(y=commute_transit, x0=commute_car, weight=population)
} else {
    regr = linear_regression(y=commute_transit, x0=commute_car, weight=population, allow_intercept=false)
}
regr.w0 = regr.w0 * 2; regr.w0
`

void test('basic parsing', (): void => {
    assert.deepStrictEqual(
        parse('x = 2'),
        {
            type: 'assignment',
            lhs: { type: 'identifier', name: { node: 'x', location: { start: { lineIdx: 0, colIdx: 0 }, end: { lineIdx: 0, colIdx: 1 } } } },
            value: { type: 'constant', value: { node: 2, location: { start: { lineIdx: 0, colIdx: 4 }, end: { lineIdx: 0, colIdx: 5 } } } },
        },
    )
    assert.deepStrictEqual(
        parseAndRender('x = 2; y = x'),
        '(statements (assign (id x) (const 2)) (assign (id y) (id x)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x'),
        '(expr (id x))',
    )
    assert.deepStrictEqual(
        parseAndRender('abc()'),
        '(expr (fn (id abc)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x(y)'),
        '(expr (fn (id x) (id y)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x(y, z)'),
        '(expr (fn (id x) (id y) (id z)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x(y, z=2)'),
        '(expr (fn (id x) (id y) (named z (const 2))))',
    )
    assert.deepStrictEqual(
        parseAndRender('x(y, z=2, y)'),
        '(expr (fn (id x) (id y) (named z (const 2)) (id y)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x(y, f())'),
        '(expr (fn (id x) (id y) (fn (id f))))',
    )
    assert.deepStrictEqual(
        parseAndRender('x(y)(z)'),
        '(expr (fn (fn (id x) (id y)) (id z)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x + y + z'),
        '(expr (+ (+ (id x) (id y)) (id z)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x + y - z'),
        '(expr (- (+ (id x) (id y)) (id z)))',
    )
    assert.deepStrictEqual(
        parseAndRender('x + y * z'),
        '(expr (+ (id x) (* (id y) (id z))))',
    )
    assert.deepStrictEqual(
        parseAndRender('x + y ** (a + b)'),
        '(expr (+ (id x) (** (id y) (+ (id a) (id b)))))',
    )
    assert.deepStrictEqual(
        parseAndRender('u | x + y < z & a > b'),
        parseAndRender('u | (((x + y) < z) & (a > b))'),
    )
    assert.deepStrictEqual(
        parseAndRender('/ z'),
        '(errors (error "Unexpected operator /" at 0:0))',
    )
    assert.deepStrictEqual(
        parseAndRender('x + y + / z'),
        '(errors (error "Unexpected operator /" at 0:8))',
    )
    assert.deepStrictEqual(
        parseAndRender('x + -y'),
        '(expr (+ (id x) (- (id y))))',
    )
    assert.deepStrictEqual(
        parseAndRender('x + -y * z'),
        parseAndRender('x + (- (y * z))'),
    )
    assert.deepStrictEqual(
        parseAndRender('x * -y + z'),
        parseAndRender('x * (- y) + z'),
    )
    assert.deepStrictEqual(
        parseAndRender('--y'),
        '(errors (error "Unrecognized token: Invalid operator: --" at 0:0))',
    )
    assert.deepStrictEqual(
        parseAndRender('- -y'),
        '(expr (- (- (id y))))',
    )
    assert.deepStrictEqual(
        parseAndRender('x * - -y + z'),
        parseAndRender(' x * (- (- y)) + z'),
    )
    assert.deepStrictEqual(
        parseAndRender('x * - - - +y + z'),
        parseAndRender(' x * (- (- (- (+y)))) + z'),
    )
    assert.deepStrictEqual(
        parseAndRender('! x > 0'),
        parseAndRender(' ! (x > 0)'),
    )

    // assert.deepStrictEqual(
    //     parseAndRender('(x * ----y) + z'),
    //     parseAndRender('x * (-(-(-(- y)))) + z'),
    // )
    assert.deepStrictEqual(
        parseAndRender('regr = linear_regression(y=commute_transit, x0=commute_car, weight=population)'),
        '(assign (id regr) (fn (id linear_regression) (named y (id commute_transit)) (named x0 (id commute_car)) (named weight (id population))))',
    )
    const ifStmtS = '(expr (if (> (id x) (const 2)) (assign (id y) (const 3)) (assign (id y) (const 4))))'
    assert.deepStrictEqual(
        parseAndRender('if (x > 2) { y = 3 } else { y = 4 }'),
        ifStmtS,
    )
    const multiLineIf = `
    if (x > 2) {
        y = 3
    } else {
        y = 4
    }
    `
    assert.deepStrictEqual(
        parseAndRender(multiLineIf),
        ifStmtS,
    )
    assert.deepStrictEqual(
        parseAndRender('x.y'),
        '(expr (attr (id x) y))',
    )
    assert.deepStrictEqual(
        parseAndRender('f.z(2).y(3)'),
        '(expr (fn (attr (fn (attr (id f) z) (const 2)) y) (const 3)))',
    )
    assert.deepStrictEqual(
        parseAndRender(multiRegression),
        `(statements ${[
            [
                '(expr (if',
                '(< (id pw_density_1km) (const 1000))',
                '(assign (id regr) (fn (id linear_regression) (named y (id commute_transit)) (named x0 (id commute_car)) (named weight (id population))))',
                '(assign (id regr) (fn (id linear_regression) (named y (id commute_transit)) (named x0 (id commute_car)) (named weight (id population)) (named allow_intercept (id false))))'//
                + '))',
            ].join(' '),
            '(assign (attr (id regr) w0) (* (attr (id regr) w0) (const 2)))',
            '(expr (attr (id regr) w0))',
        ].join(' ')})`,
    )
    const multiLineIfBody = `
    if (x > 2) {
        y = 3
        z = 2
    } else {
        y = 4
    }
    `
    assert.deepStrictEqual(
        parseAndRender(multiLineIfBody),
        '(expr (if (> (id x) (const 2)) (statements (assign (id y) (const 3)) (assign (id z) (const 2))) (assign (id y) (const 4))))',
    )
    assert.deepStrictEqual(
        parseAndRender('if (x) {}'),
        '(expr (if (id x) (statements )))',
    )
})

void test('parse errors in if', (): void => {
    assert.deepStrictEqual(
        parseAndRender('if'),
        '(errors (error "Expected opening bracket ( after if" at 0:0))',
    )
    assert.deepStrictEqual(
        parseAndRender('if (x'),
        '(errors (error "Expected closing bracket ) after if condition" at 0:4))',
    )
    assert.deepStrictEqual(
        parseAndRender('if (x)'),
        '(errors (error "Expected opening bracket { after if condition" at 0:5))',
    )
    assert.deepStrictEqual(
        parseAndRender('if (x) { y = 2 '),
        '(errors (error "Expected } after if block" at 0:15))',
    )
    assert.deepStrictEqual(
        parseAndRender('(if (x) { y = 2 )'),
        '(errors (error "Expected } after if block" at 0:14))',
    )
    assert.deepStrictEqual(
        parseAndRender('if (x) { y = 2 } else'),
        '(errors (error "Expected opening bracket { after else" at 0:17))',
    )
    assert.deepStrictEqual(
        parseAndRender('if (x) { y = 2 } else { x = 3'),
        '(errors (error "Expected } after else block" at 0:29))',
    )
})

void test('parse errors (other)', (): void => {
    assert.deepStrictEqual(
        parseAndRender(''),
        '(errors (error "Unexpected end of input" at 0:0))',
    )
    assert.deepStrictEqual(
        parseAndRender('if (x*)'),
        '(errors (error "Unexpected bracket )" at 0:6))',
    )
    assert.deepStrictEqual(
        parseAndRender('2 + 3 = 4'),
        '(errors (error "Cannot assign to this expression" at 0:0))',
    )
    assert.deepStrictEqual(
        parseAndRender('f(xy) = 4'),
        '(errors (error "Cannot assign to this expression" at 0:0))',
    )
    assert.deepStrictEqual(
        parseAndRender('x = 2 +'),
        '(errors (error "Unexpected end of input" at 0:7))',
    )
    assert.deepStrictEqual(
        parseAndRender('x = (2'),
        '(errors (error "Expected closing bracket ) to match this one" at 0:4))',
    )
    assert.deepStrictEqual(
        parseAndRender('f('),
        '(errors (error "Unexpected end of input" at 0:2))',
    )
    assert.deepStrictEqual(
        parseAndRender('f(2,'),
        '(errors (error "Unexpected end of input" at 0:4))',
    )
    assert.deepStrictEqual(
        parseAndRender('f(a=3 *'),
        '(errors (error "Unexpected end of input" at 0:7))',
    )
    assert.deepStrictEqual(
        parseAndRender('f(a*2=3)'),
        '(errors (error "Expected identifier for named argument" at 0:2))',
    )
    assert.deepStrictEqual(
        parseAndRender('f(a=2 c)'),
        '(errors (error "Expected comma , or closing bracket ); instead received c" at 0:6))',
    )
    assert.deepStrictEqual(
        parseAndRender('x.2'),
        '(errors (error "Expected identifier after the dot" at 0:1))',
    )
})

void test('object literal', (): void => {
    assert.deepStrictEqual(
        parseAndRender('{ a: 1, b: 2 }'),
        '(expr (object (a (const 1)) (b (const 2))))',
    )
    assert.deepStrictEqual(
        parseAndRender('{ a: 1 b'),
        '(errors (error "Expected comma , or closing bracket } after object field name; instead received b" at 0:7))',
    )
    assert.deepStrictEqual(
        parseAndRender('{ a: 1, b }'),
        '(errors (error "Expected : token after object field name" at 0:8))',
    )
    assert.deepStrictEqual(
        parseAndRender('{ a: 1, 2: b }'),
        '(errors (error "Expected identifier for object field name" at 0:6))',
    )
    assert.deepStrictEqual(
        parseAndRender('{ a: 1, b: {a: 1, 2: b} }'),
        '(errors (error "Expected identifier for object field name" at 0:16))',
    )
})

void test('vector literal', (): void => {
    assert.deepStrictEqual(
        parseAndRender('[1, 2, 3]'),
        '(expr (vector (const 1) (const 2) (const 3)))',
    )
    assert.deepStrictEqual(
        parseAndRender('[[2]]'),
        '(expr (vector (vector (const 2))))',
    )
    assert.deepStrictEqual(
        parseAndRender('[[]]'),
        '(expr (vector (vector )))',
    )
    assert.deepStrictEqual(
        parseAndRender('[1, 2, 3'),
        '(errors (error "Expected comma , or closing bracket ] after vector element" at 0:8))',
    )
    assert.deepStrictEqual(
        parseAndRender('[1, 2, 3*]'),
        '(errors (error "Unexpected bracket ]" at 0:9))',
    )
})

function ids(code: string): Set<string> {
    const res = parse(code)
    if (res.type === 'error') {
        throw new Error(`Parsing error: ${res.errors.map(err => err.message).join(', ')}`)
    }
    return allIdentifiers(res)
}

void test('collect identifiers', (): void => {
    assert.deepStrictEqual(
        ids('x = 2; y = x + 3; z = y * 4'),
        new Set(['x', 'y', 'z']),
    )
    assert.deepStrictEqual(
        ids('a.b = c'),
        new Set(['a', 'c']),
    )
    assert.deepStrictEqual(
        ids('a.b.c = d.e.f'),
        new Set(['a', 'd']),
    )
    assert.deepStrictEqual(
        ids('(2 + a).y = f(2)'),
        new Set(['a', 'f']),
    )
    assert.deepStrictEqual(
        ids('f(x, y=z)'),
        new Set(['f', 'x', 'z']),
    )
    assert.deepStrictEqual(
        ids('[a, b, {c: d, e: f}]'),
        new Set(['a', 'b', 'd', 'f']),
    )
    assert.deepStrictEqual(
        ids('if (x > 2) { y = 3 } else { z  = 4 }'),
        new Set(['x', 'y', 'z']),
    )
    assert.deepStrictEqual(
        ids('if (x > 2) { y = 3; z = 4 } else { if ([u].v) { a = -t } }'),
        new Set(['x', 'y', 'z', 'u', 'a', 't']),
    )
})
