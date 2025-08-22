import assert from 'assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'

import { Block, lex, noLocation } from '../src/urban-stats-script/lexer'
import { allIdentifiers, parse, parseNoErrorAsCustomNode, toSExp, unparse } from '../src/urban-stats-script/parser'

import { emptyContext, parseProgram } from './urban-stats-script-utils'

const testBlock: Block = {
    type: 'single',
    ident: 'test',
}

void test('basic lexing with indices', (): void => {
    assert.deepStrictEqual(lex(testBlock, '1 23 3.3'), [
        { token: { type: 'number', value: 1 }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 0, charIdx: 0 }, end: { block: testBlock, lineIdx: 0, colIdx: 1, charIdx: 1 } } },
        { token: { type: 'number', value: 23 }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 2, charIdx: 2 }, end: { block: testBlock, lineIdx: 0, colIdx: 4, charIdx: 4 } } },
        { token: { type: 'number', value: 3.3 }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 5, charIdx: 5 }, end: { block: testBlock, lineIdx: 0, colIdx: 8, charIdx: 8 } } },
        { token: { type: 'operator', value: 'EOL' }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 8, charIdx: 8 }, end: { block: testBlock, lineIdx: 0, colIdx: 8, charIdx: 8 } } },
    ])
    assert.deepStrictEqual(lex(testBlock, '"abc"'), [
        { token: { type: 'string', value: 'abc' }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 0, charIdx: 0 }, end: { block: testBlock, lineIdx: 0, colIdx: 5, charIdx: 5 } } },
        { token: { type: 'operator', value: 'EOL' }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 5, charIdx: 5 }, end: { block: testBlock, lineIdx: 0, colIdx: 5, charIdx: 5 } } },
    ])
    assert.deepStrictEqual(lex(testBlock, '"abc\\""'), [
        { token: { type: 'string', value: 'abc"' }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 0, charIdx: 0 }, end: { block: testBlock, lineIdx: 0, colIdx: 7, charIdx: 7 } } },
        { token: { type: 'operator', value: 'EOL' }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 7, charIdx: 7 }, end: { block: testBlock, lineIdx: 0, colIdx: 7, charIdx: 7 } } },
    ])
    assert.deepStrictEqual(lex(testBlock, 'f(2, "abc \\" 3.5")'), [
        { token: { type: 'identifier', value: 'f' }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 0, charIdx: 0 }, end: { block: testBlock, lineIdx: 0, colIdx: 1, charIdx: 1 } } },
        { token: { type: 'bracket', value: '(' }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 1, charIdx: 1 }, end: { block: testBlock, lineIdx: 0, colIdx: 2, charIdx: 2 } } },
        { token: { type: 'number', value: 2 }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 2, charIdx: 2 }, end: { block: testBlock, lineIdx: 0, colIdx: 3, charIdx: 3 } } },
        { token: { type: 'operator', value: ',' }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 3, charIdx: 3 }, end: { block: testBlock, lineIdx: 0, colIdx: 4, charIdx: 4 } } },
        { token: { type: 'string', value: 'abc " 3.5' }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 5, charIdx: 5 }, end: { block: testBlock, lineIdx: 0, colIdx: 17, charIdx: 17 } } },
        { token: { type: 'bracket', value: ')' }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 17, charIdx: 17 }, end: { block: testBlock, lineIdx: 0, colIdx: 18, charIdx: 18 } } },
        { token: { type: 'operator', value: 'EOL' }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 18, charIdx: 18 }, end: { block: testBlock, lineIdx: 0, colIdx: 18, charIdx: 18 } } },
    ])
})

function shortFormLex(input: string): (string | number | [string | number, string])[] {
    const lines = input.split('\n')
    const lexedTokens = lex(testBlock, input)
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
    assert.deepStrictEqual(shortFormLex('x.y'), ['x', '.', 'y', ['EOL', '']])
    assert.deepStrictEqual(shortFormLex('2+3'), [2, '+', 3, ['EOL', '']])
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
    assert.deepStrictEqual(shortFormLex('2+'), [
        2,
        '+',
        [
            'EOL',
            '',
        ],
    ])
})

function parseAndRender(input: string): string {
    const res = parse(input, testBlock)
    if (res.type === 'error') {
        const renderedErrors = res.errors.map(err => `(error ${JSON.stringify(err.value)} at ${err.location.start.lineIdx}:${err.location.start.colIdx})`)
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
        parse('x = 2', testBlock),
        {
            type: 'assignment',
            lhs: { type: 'identifier', name: { node: 'x', location: { start: { block: testBlock, lineIdx: 0, colIdx: 0, charIdx: 0 }, end: { block: testBlock, lineIdx: 0, colIdx: 1, charIdx: 1 } } } },
            value: { type: 'constant', value: { node: { type: 'number', value: 2 }, location: { start: { block: testBlock, lineIdx: 0, colIdx: 4, charIdx: 4 }, end: { block: testBlock, lineIdx: 0, colIdx: 5, charIdx: 5 } } } },
        },
    )
    assert.deepStrictEqual(
        parseAndRender('x = 2; y = x'),
        '(statements (assign (id x) (const 2)) (assign (id y) (id x)))',
    )
    assert.deepStrictEqual(
        parseAndRender(''),
        '(statements )',
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
})

void test('basic if parsing', (): void => {
    assert.deepStrictEqual(
        parseAndRender('if (x) { y = 2 }'),
        '(expr (if (id x) (assign (id y) (const 2))))',
    )
})

void test('more complex if parsing', (): void => {
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

void test('parse custom nodes', (): void => {
    const justTheExpression = `customNode("y = x * x")`
    assert.deepStrictEqual(
        parseAndRender(justTheExpression),
        '(expr (customNode (assign (id y) (* (id x) (id x))) "y = x * x"))',
    )
    const singleLine = `2 + customNode("y = x * x")`
    assert.deepStrictEqual(
        parseAndRender(singleLine),
        '(expr (+ (const 2) (customNode (assign (id y) (* (id x) (id x))) "y = x * x")))',
    )
    const multiLine = `x = [1, 2, 3]
        2 + customNode("y = x * x\\ny")`
    assert.deepStrictEqual(
        parseAndRender(multiLine),
        '(statements (assign (id x) (vector (const 1) (const 2) (const 3))) (expr (+ (const 2) (customNode (statements (assign (id y) (* (id x) (id x))) (expr (id y))) "y = x * x\\ny"))))',
    )
    assert.deepStrictEqual(
        unparse(parseProgram(`x = [1, 2, 3]
            customNode("x * x")`)),
        'x = [1, 2, 3];\ncustomNode("x * x")',
    )
    assert.deepStrictEqual(
        unparse(parseProgram(`x = [1, 2, 3]
            customNode("x * x")`), { simplify: true }),
        'x = [1, 2, 3];\nx * x',
    )
})

void test('unparse multi-line customNode', (): void => {
    assert.deepStrictEqual(
        unparse(parseProgram(`x = [1, 2, 3]
            customNode("y = x * x\\ny")`)),
        'x = [1, 2, 3];\ncustomNode("y = x * x\\ny")',
    )
    assert.deepStrictEqual(
        unparse(parseProgram(`x = [1, 2, 3]
            customNode("y = x * x\\ny")`), { simplify: true }),
        'x = [1, 2, 3];\ny = x * x\ny',
    )
})

void test('unparse multi-line customNode in an expressional context', (): void => {
    const program = parseProgram(`x = [1, 2, 3]
            2 + customNode("y = x * x\\ny")`)
    assert.deepStrictEqual(
        unparse(program),
        'x = [1, 2, 3];\n2 + customNode("y = x * x\\ny")',
    )
    assert.deepStrictEqual(
        unparse(program, { simplify: true }),
        'x = [1, 2, 3];\n2 + do { y = x * x; y }',
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
        '(errors (error "Expected } after if block" at 0:13))',
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
        '(errors (error "Expected } after else block" at 0:28))',
    )
})

void test('parse errors (other)', (): void => {
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
        '(errors (error "Unexpected end of input" at 0:6))',
    )
    assert.deepStrictEqual(
        parseAndRender('x = (2'),
        '(errors (error "Expected closing bracket ) to match this one" at 0:4))',
    )
    assert.deepStrictEqual(
        parseAndRender('f('),
        '(errors (error "Unexpected end of input" at 0:1))',
    )
    assert.deepStrictEqual(
        parseAndRender('f(2,'),
        '(errors (error "Unexpected end of input" at 0:3))',
    )
    assert.deepStrictEqual(
        parseAndRender('f(a=3 *'),
        '(errors (error "Unexpected end of input" at 0:6))',
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
        '(errors (error "Expected comma , or closing bracket ] after vector element" at 0:7))',
    )
    assert.deepStrictEqual(
        parseAndRender('[1, 2, 3*]'),
        '(errors (error "Unexpected bracket ]" at 0:9))',
    )
})

void test('condition-expression', (): void => {
    assert.deepStrictEqual(
        parseAndRender('condition(x); y = 2; z = 3'),
        '(condition (id x) (assign (id y) (const 2)) (assign (id z) (const 3)))',
    )
    assert.deepStrictEqual(
        parseAndRender('condition(x); x = 2; condition(y); z = 3'),
        '(condition (id x) (assign (id x) (const 2)) (condition (id y) (assign (id z) (const 3))))',
    )
    assert.deepStrictEqual(
        parseAndRender('condition(x); condition(y); z = 3'),
        '(condition (id x) (condition (id y) (assign (id z) (const 3))))',
    )
    assert.deepStrictEqual(
        parseAndRender('condition(x); condition(y); condition(z)'),
        '(condition (id x) (condition (id y) (condition (id z) )))',
    )
    assert.deepStrictEqual(
        parseAndRender('condition(x, y)'),
        '(errors (error "Expected closing bracket ) after condition" at 0:10))',
    )
    assert.deepStrictEqual(
        parseAndRender('condition(x)'),
        '(condition (id x) )',
    )
    assert.deepStrictEqual(
        parseAndRender('if (x) { condition(y); abcdefg = 3  }; x = 4'),
        '(statements (expr (if (id x) (condition (id y) (assign (id abcdefg) (const 3))))) (assign (id x) (const 4)))',
    )
})

void test('unparse condition', (): void => {
    assert.deepStrictEqual(
        unparse(parseProgram('condition (x); y = 2; z = 3')),
        'condition (x)\ny = 2;\nz = 3',
    )
    assert.deepStrictEqual(
        unparse(parseProgram('condition (customNode("x")); y = 2; z = 3'), { simplify: true }),
        'condition (x)\ny = 2;\nz = 3',
    )
})

void test('parse errors in condition', (): void => {
    assert.deepStrictEqual(
        parseAndRender('condition'),
        '(errors (error "Expected opening bracket ( after condition" at 0:0))',
    )
    assert.deepStrictEqual(
        parseAndRender('condition('),
        '(errors (error "Unexpected end of input" at 0:9))',
    )
    assert.deepStrictEqual(
        parseAndRender('condition(x'),
        '(errors (error "Expected closing bracket ) after condition" at 0:10))',
    )
})

function ids(code: string): Set<string> {
    const res = parse(code, testBlock)
    if (res.type === 'error') {
        throw new Error(`Parsing error: ${res.errors.map(err => err.value).join(', ')}`)
    }
    return allIdentifiers(res, emptyContext())
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
    assert.deepStrictEqual(
        ids('regression(x1=x1+0, y=y)'),
        new Set(['x1', 'y', 'regression', 'null', 'false']),
    )
    assert.deepStrictEqual(
        ids('regression(x1=z+0, y=t)'),
        new Set(['z', 't', 'regression', 'null', 'false']),
    )
    assert.deepStrictEqual(
        ids('cMap(data=population, scale=linearScale())'),
        new Set(['cMap', 'population', 'linearScale', 'osmBasemap', 'geo', 'defaultInsets', 'colorBlack', 'constructOutline', 'false', 'null', 'rgb']),
    )
    assert.deepStrictEqual(
        allIdentifiers(parseNoErrorAsCustomNode('++', 'test'), emptyContext()),
        new Set([]),
    )
    assert.deepStrictEqual(
        ids('x = 2; y = x + 3; z = y * 4; condition(x); condition(y); z = 3'),
        new Set(['x', 'y', 'z']),
    )
})

function parseThenUnparse(code: string, opts?: Parameters<typeof unparse>[1]): string {
    const res = parse(code, testBlock)
    if (res.type === 'error') {
        throw new Error(`Parsing error: ${res.errors.map(err => err.value).join(', ')}`)
    }
    return unparse(res, opts)
}

void test('unparse', (): void => {
    assert.deepStrictEqual(
        parseThenUnparse('x = 2; y = x + 3; z = y * 4'),
        'x = 2;\ny = x + 3;\nz = y * 4',
    )
    assert.deepStrictEqual(
        parseThenUnparse(''),
        '',
    )
    assert.deepStrictEqual(
        unparse({ type: 'statements', result: [
            { type: 'expression', value: { type: 'customNode', expr: { type: 'statements', result: [], entireLoc: noLocation }, originalCode: '' } },
            { type: 'expression', value: { type: 'customNode', expr: { type: 'statements', result: [], entireLoc: noLocation }, originalCode: '' } },
        ], entireLoc: noLocation }),
        'customNode("");\ncustomNode("")',
    )
    assert.deepStrictEqual(
        unparse({ type: 'statements', result: [
            { type: 'expression', value: { type: 'customNode', expr: { type: 'statements', result: [], entireLoc: noLocation }, originalCode: '' } },
            { type: 'expression', value: { type: 'customNode', expr: { type: 'statements', result: [], entireLoc: noLocation }, originalCode: '' } },
        ], entireLoc: noLocation }, { simplify: true }),
        '',
    )
    assert.deepStrictEqual(
        parseThenUnparse('condition(true); x = 2; y = 3'),
        'condition (true)\nx = 2;\ny = 3',
    )
    assert.deepStrictEqual(
        parseThenUnparse('condition(true); x = 2; y = 3', { simplify: true }),
        'x = 2;\ny = 3',
    )
    assert.deepStrictEqual(
        parseThenUnparse('customNode("x = 2\\ny = 3")'),
        'customNode("x = 2\\ny = 3")',
    )
    assert.deepStrictEqual(
        parseThenUnparse('customNode("x = 2\\ny = 3")', { simplify: true }),
        'x = 2\ny = 3',
    )
    assert.deepStrictEqual(
        parseThenUnparse('condition(x); x = 2; y = 3'),
        'condition (x)\nx = 2;\ny = 3',
    )
})

void test('well-formatted-uss', (): void => {
    // all files in data/well-formatted-uss
    const files = fs.readdirSync('unit/data/well-formatted-uss')
    for (const file of files) {
        const code = fs.readFileSync(`unit/data/well-formatted-uss/${file}`, 'utf8')
        assert.deepStrictEqual(
            parseThenUnparse(code),
            code,
        )
    }
})

void test('parse error nodes', (): void => {
    // Test that parseErrorAsExpression creates an error node with the correct message
    const errorNode = parseNoErrorAsCustomNode('This is a test error', 'test')
    assert.deepStrictEqual(errorNode, {
        type: 'customNode',
        originalCode: 'This is a test error',
        expectedType: undefined,
        expr: {
            type: 'parseError',
            originalCode: 'This is a test error',
            errors: [
                {
                    type: 'error',
                    value: 'Expected end of line or ; after',
                    location: {
                        start: { block: { type: 'single', ident: 'test' }, lineIdx: 0, colIdx: 0, charIdx: 0 },
                        end: { block: { type: 'single', ident: 'test' }, lineIdx: 0, colIdx: 4, charIdx: 4 },
                    },
                },
            ],
        },
    })
    assert.strictEqual(errorNode.type, 'customNode')
    assert.deepStrictEqual(unparse(errorNode.expr), 'This is a test error')
    assert.deepStrictEqual(toSExp(errorNode), '(customNode (parseError "This is a test error" [{"type":"error","value":"Expected end of line or ; after","location":{"start":{"block":{"type":"single","ident":"test"},"lineIdx":0,"colIdx":0,"charIdx":0},"end":{"block":{"type":"single","ident":"test"},"lineIdx":0,"colIdx":4,"charIdx":4}}}]) "This is a test error")')

    assert.deepStrictEqual(toSExp(parseNoErrorAsCustomNode('++', 'test')), '(customNode (parseError "++" [{"type":"error","value":"Unrecognized token: Invalid operator: ++","location":{"start":{"block":{"type":"single","ident":"test"},"lineIdx":0,"colIdx":0,"charIdx":0},"end":{"block":{"type":"single","ident":"test"},"lineIdx":0,"colIdx":2,"charIdx":2}}}]) "++")')
})

void test('unparse custom nodes with multiple lines', (): void => {
    // Test custom node with multiple statements that should become a do expression
    const multiLineNode = parseNoErrorAsCustomNode('x = 1; y = 2; x + y', 'test')
    assert.deepStrictEqual(unparse(multiLineNode), 'customNode("x = 1; y = 2; x + y")')

    // Test custom node with nested do blocks
    const nestedDoNode = parseNoErrorAsCustomNode('x = 1; do { y = x + 2 }; y', 'test')
    assert.deepStrictEqual(unparse(nestedDoNode), 'customNode("x = 1; do { y = x + 2 }; y")')

    // Test custom node with conditionals
    const conditionalNode = parseNoErrorAsCustomNode('x = 3; if (x > 2) { y = 1 } else { y = 2 }; y', 'test')
    assert.deepStrictEqual(unparse(conditionalNode), 'customNode("x = 3; if (x > 2) { y = 1 } else { y = 2 }; y")')

    // Test custom node with function calls
    const functionNode = parseNoErrorAsCustomNode('x = 5; y = x * 2; f(x, y)', 'test')
    assert.deepStrictEqual(unparse(functionNode), 'customNode("x = 5; y = x * 2; f(x, y)")')

    // Test custom node with object creation
    const objectNode = parseNoErrorAsCustomNode('x = 1; y = 2; { a: x, b: y }', 'test')
    assert.deepStrictEqual(unparse(objectNode), 'customNode("x = 1; y = 2; { a: x, b: y }")')

    // Test custom node with vector creation
    const vectorNode = parseNoErrorAsCustomNode('x = 1; y = 2; [x, y, x + y]', 'test')
    assert.deepStrictEqual(unparse(vectorNode), 'customNode("x = 1; y = 2; [x, y, x + y]")')

    // Test custom node with just one statement (should not become do)
    const singleLineNode = parseNoErrorAsCustomNode('x + y', 'test')
    assert.deepStrictEqual(unparse(singleLineNode), 'customNode("x + y")')

    // Test custom node with empty statements (should become do with empty block)
    const emptyNode = parseNoErrorAsCustomNode('', 'test')
    assert.deepStrictEqual(unparse(emptyNode), 'customNode("")')

    // Test custom node with complex nested structure
    const complexNode = parseNoErrorAsCustomNode('x = 1; y = 2; if (x < y) { z = do { a = x; b = y; a + b } } else { z = x * y }; z', 'test')
    assert.deepStrictEqual(unparse(complexNode), 'customNode("x = 1; y = 2; if (x < y) { z = do { a = x; b = y; a + b } } else { z = x * y }; z")')
})
