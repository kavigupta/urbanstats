import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { parseNoError, unparse } from '../src/urban-stats-script/parser'

void describe('unparse vector', () => {
    void test('without wrapping', () => {
        assert.equal(unparse(parseNoError('[1, 2, 3]', '')), '[1, 2, 3]')
    })
    void test('with wrapping', () => {
        const expected = `[
    "The quick brown fox jumped over the lazy dog!",
    "The quick brown fox jumped over the lazy dog!",
    "The quick brown fox jumped over the lazy dog!"
]`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })

    void test('start wrapping from top level', () => {
        const expected = `[
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
]`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })

    void test('some need to be wrapped', () => {
        const expected = `[
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    [
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        31,
        32,
        33,
        34,
        35,
        36,
        37,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        46,
        47,
        48,
        49,
        50
    ]
]`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })
})
void describe('unparse object', () => {
    void test('without wrapping', () => {
        assert.equal(unparse(parseNoError('{"a": 1, "b": 2}', '')), '{"a": 1, "b": 2}')
    })

    void test('with wrapping', () => {
        const expected = `{
    "veryLongPropertyNameThatCausesWrapping": "The quick brown fox jumped over the lazy dog!",
    "anotherVeryLongPropertyName": "The quick brown fox jumped over the lazy dog!",
    "yetAnotherLongPropertyName": "The quick brown fox jumped over the lazy dog!"
}`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })

    void test('start wrapping from top level', () => {
        const expected = `{
    "array1": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    "array2": [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    "array3": [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
}`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })

    void test('some properties need to be wrapped', () => {
        const expected = `{
    "shortArray": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    "mediumArray": [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    "veryLongArrayThatNeedsWrapping": [
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        31,
        32,
        33,
        34,
        35,
        36,
        37,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        46,
        47,
        48,
        49,
        50
    ]
}`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })

    void test('nested objects', () => {
        const expected = `{
    "nested": {
        "innerProperty": "value",
        "anotherInnerProperty": "anotherValue"
    },
    "simpleProperty": "simpleValue"
}`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })
})
void describe('unparse function calls', () => {
    void test('function with unnamed arguments - no wrapping', () => {
        assert.equal(unparse(parseNoError('myFunction(1, 2, 3)', '')), 'myFunction(1, 2, 3)')
    })

    void test('function with unnamed arguments - with wrapping', () => {
        const expected = `myFunction(
    "The quick brown fox jumped over the lazy dog!",
    "The quick brown fox jumped over the lazy dog!",
    "The quick brown fox jumped over the lazy dog!"
)`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })

    void test('function with unnamed arguments - start wrapping from top level', () => {
        const expected = `myFunction(
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    [21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
)`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })

    void test('function with named arguments - no wrapping', () => {
        assert.equal(unparse(parseNoError('myFunction(a=1, b=2)', '')), 'myFunction(a=1, b=2)')
    })

    void test('function with named arguments - with wrapping', () => {
        const expected = `myFunction(
    veryLongParameterName="The quick brown fox jumped over the lazy dog!",
    anotherVeryLongParameterName="The quick brown fox jumped over the lazy dog!",
    yetAnotherLongParameterName="The quick brown fox jumped over the lazy dog!"
)`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })

    void test('function with named arguments - some need wrapping', () => {
        const expected = `myFunction(
    shortParam=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    mediumParam=[11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    veryLongParameterThatNeedsWrapping=[
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        31,
        32,
        33,
        34,
        35,
        36,
        37,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        46,
        47,
        48,
        49,
        50
    ]
)`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })

    void test('function with mixed arguments', () => {
        const expected = `myFunction(
    "positional argument",
    namedParam={
        innerProperty: "value",
        anotherInnerProperty: "anotherValue",
        yetAnotherInnerProperty: "yetAnotherValue"
    },
    42
)`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })

    void test('nested function calls', () => {
        const expected = `outerFunction(
    innerFunction(1, 2, 3),
    anotherInnerFunction(
        param="value",
        anotherParam=[1, 2, 3, 4, 5],
        yetAnotherParam="yetAnotherValue"
    )
)`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })
})

void describe('unparse wrapping', () => {
    void test('mapper example script', () => {
        const expected = `nonFilteredPopulation = sum(population);
condition (population > 10000000)
cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    textBoxes=[
        textBox(
            screenBounds={
                north: 1,
                east: 0.28955642611994215,
                south: 0.8888666610512129,
                west: 0
            },
            text=rtfDocument([
                rtfString("There are ", font="Arial", italic=true),
                rtfString(
                    toString(
                        (round(10000 * (sum(population)) / nonFilteredPopulation)) / 100
                    ),
                    bold=true,
                    font="Courier"
                ),
                rtfString("% of people represented in this map", strike=true)
            ])
        ),
        textBox(
            screenBounds={north: 0.5, east: 0.95, south: 0.1, west: 0.7},
            borderColor=hsv(50, 1, 1),
            backgroundColor=rgb(0.9, 0.9, 0.7),
            text=rtfDocument([
                rtfFormula(
                    "f(\\\\relax{x}) = \\\\int_{-\\\\infty}^\\\\infty \\\\hat f(\\\\xi)\\\\,e^{2 \\\\pi i \\\\xi x}\\\\,d\\\\xi"
                ),
                rtfString("\\n\\n", align=alignCenter),
                rtfImage(
                    "https://upload.wikimedia.org/wikipedia/commons/f/f6/Regulierwehr_Port01_08.jpg"
                )
            ])
        )
    ]
)`
        assert.equal(unparse(parseNoError(expected, '')), expected)
    })
})
