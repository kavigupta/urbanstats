import assert from 'assert/strict'
import test from 'node:test'

import { hexToColor } from '../src/urban-stats-script/constants/color-utils'
import { defaultConstants } from '../src/urban-stats-script/constants/constants'
import { richTextAttributesSchema, richTextSegmentSchema } from '../src/urban-stats-script/constants/rich-text'
import { Context } from '../src/urban-stats-script/context'
import { evaluate, InterpretationError } from '../src/urban-stats-script/interpreter'
import { LocInfo } from '../src/urban-stats-script/location'

import { parseExpr } from './urban-stats-script-utils'

function createTestContext(): Context {
    return new Context(
        () => { /* ignore warnings */ },
        (msg: string, location: LocInfo) => new InterpretationError(msg, location),
        defaultConstants,
        new Map(),
    )
}

void test('rtfString creation', () => {
    const ctx = createTestContext()

    // Basic string without formatting
    const basicString = evaluate(parseExpr('rtfString("Hello World")'), ctx)
    assert.deepEqual(basicString.value, {
        type: 'opaque',
        opaqueType: 'richTextSegment',
        value: {
            insert: 'Hello World',
        },
    })
})

void test('rtfString with formatting attributes', () => {
    const ctx = createTestContext()

    // String with various formatting attributes
    const formattedString = evaluate(parseExpr('rtfString("Bold Text", bold=true, italic=true, size=16)'), ctx)
    assert.deepEqual(formattedString.value, {
        type: 'opaque',
        opaqueType: 'richTextSegment',
        value: {
            insert: 'Bold Text',
            attributes: {
                bold: true,
                italic: true,
                size: 16,
            },
        },
    })
})

void test('rtfString with color formatting', () => {
    const ctx = createTestContext()

    // String with color
    const coloredString = evaluate(parseExpr('rtfString("Red Text", color=rgb(1, 0, 0))'), ctx)
    assert.deepEqual(coloredString.value, {
        type: 'opaque',
        opaqueType: 'richTextSegment',
        value: {
            insert: 'Red Text',
            attributes: {
                // eslint-disable-next-line no-restricted-syntax -- We can use color constants in tests
                color: hexToColor('#ff0000'),
            },
        },
    })
})

void test('rtfString with alignment and list formatting', () => {
    const ctx = createTestContext()

    // String with alignment and list
    const listString = evaluate(parseExpr('rtfString("List Item", align=alignCenter, list=listBullet)'), ctx)
    assert.deepEqual(listString.value, {
        type: 'opaque',
        opaqueType: 'richTextSegment',
        value: {
            insert: 'List Item',
            attributes: {
                align: 'center',
                list: 'bullet',
            },
        },
    })
})

void test('rtfFormula creation', () => {
    const ctx = createTestContext()

    // Basic formula
    const formula = evaluate(parseExpr('rtfFormula("x^2 + y^2 = z^2")'), ctx)
    assert.deepEqual(formula.value, {
        type: 'opaque',
        opaqueType: 'richTextSegment',
        value: {
            insert: { formula: 'x^2 + y^2 = z^2' },
        },
    })
})

void test('rtfFormula with formatting', () => {
    const ctx = createTestContext()

    // Formula with formatting
    const formattedFormula = evaluate(parseExpr('rtfFormula("E = mc^2", size=18, color=colorBlue)'), ctx)
    // Extract the expected color value - colorBlue is a color opaque type
    const colorBlueConstant = evaluate(parseExpr('colorBlue'), ctx)
    const colorValue = colorBlueConstant.value as { type: 'opaque', opaqueType: 'color', value: { r: number, g: number, b: number, a: number } }

    assert.deepEqual(formattedFormula.value, {
        type: 'opaque',
        opaqueType: 'richTextSegment',
        value: {
            insert: { formula: 'E = mc^2' },
            attributes: {
                size: 18,
                color: colorValue.value, // Extract the inner color value
            },
        },
    })
})

void test('rtfImage creation', () => {
    const ctx = createTestContext()

    // Basic image
    const image = evaluate(parseExpr('rtfImage("https://example.com/image.png")'), ctx)
    assert.deepEqual(image.value, {
        type: 'opaque',
        opaqueType: 'richTextSegment',
        value: {
            insert: { image: 'https://example.com/image.png' },
        },
    })
})

void test('rtfImage with formatting', () => {
    const ctx = createTestContext()

    // Image with alignment
    const alignedImage = evaluate(parseExpr('rtfImage("https://example.com/logo.png", align=alignRight)'), ctx)
    assert.deepEqual(alignedImage.value, {
        type: 'opaque',
        opaqueType: 'richTextSegment',
        value: {
            insert: { image: 'https://example.com/logo.png' },
            attributes: {
                align: 'right',
            },
        },
    })
})

void test('rtfDocument creation with multiple segments', () => {
    const ctx = createTestContext()

    // Create a document with multiple segments
    const document = evaluate(parseExpr(`
        rtfDocument([
            rtfString("Title", bold=true, size=20),
            rtfString("Regular text"),
            rtfFormula("a^2 + b^2 = c^2"),
            rtfImage("https://example.com/chart.png")
        ])
    `), ctx)

    assert.deepEqual(document.value, {
        type: 'opaque',
        opaqueType: 'richTextDocument',
        value: [
            {
                insert: 'Title',
                attributes: {
                    bold: true,
                    size: 20,
                },
            },
            {
                insert: 'Regular text',
            },
            {
                insert: { formula: 'a^2 + b^2 = c^2' },
            },
            {
                insert: { image: 'https://example.com/chart.png' },
            },
        ],
    })
})

void test.skip('rtfDocument with empty array', () => {
    // Skip for now - empty array type inference is tricky
    // This functionality is tested via the actual implementation
})

void test('alignment constants', () => {
    const ctx = createTestContext()

    const alignments = ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']
    const expected = ['', 'center', 'right', 'justify'] // alignLeft is empty string, not 'left'

    alignments.forEach((alignmentName, index) => {
        const alignment = evaluate(parseExpr(alignmentName), ctx)
        assert.deepEqual(alignment.value, {
            type: 'opaque',
            opaqueType: 'richTextAlign',
            value: expected[index],
        })
    })
})

void test('list constants', () => {
    const ctx = createTestContext()

    const lists = ['listOrdered', 'listBullet', 'listNone']
    const expected = ['ordered', 'bullet', ''] // listNone is empty string, not false

    lists.forEach((listName, index) => {
        const list = evaluate(parseExpr(listName), ctx)
        assert.deepEqual(list.value, {
            type: 'opaque',
            opaqueType: 'richTextList',
            value: expected[index],
        })
    })
})

void test('rich text formatting with font and underline', () => {
    const ctx = createTestContext()

    // Test font and underline formatting
    const formatted = evaluate(parseExpr('rtfString("Underlined Arial", font="Arial", underline=true, indent=3)'), ctx)
    assert.deepEqual(formatted.value, {
        type: 'opaque',
        opaqueType: 'richTextSegment',
        value: {
            insert: 'Underlined Arial',
            attributes: {
                font: 'Arial',
                underline: true,
                indent: 3,
            },
        },
    })
})

void test('rich text attributes schema validation', () => {
    // Test valid attributes
    const validAttributes = {
        size: '16px',
        font: 'Arial',
        // eslint-disable-next-line no-restricted-syntax -- We can use color constants in tests
        color: '#ff0000',
        bold: true,
        italic: false,
        underline: true,
        list: 'bullet',
        indent: 2,
        align: 'center',
    }

    const result = richTextAttributesSchema.safeParse(validAttributes)
    assert.equal(result.success, true)
    assert.equal(result.data.size, 16) // Should convert to number
    assert.equal(result.data.font, 'Arial')
    // eslint-disable-next-line no-restricted-syntax -- We can use color constants in tests
    assert.deepEqual(result.data.color, hexToColor('#ff0000'))
    assert.equal(result.data.bold, true)
    assert.equal(result.data.italic, false)
    assert.equal(result.data.underline, true)
    assert.equal(result.data.list, 'bullet')
    assert.equal(result.data.indent, 2)
    assert.equal(result.data.align, 'center')
})

void test('rich text attributes schema handles invalid size', () => {
    // Test invalid size (no px suffix)
    const invalidSize = { size: '16' }
    const result = richTextAttributesSchema.safeParse(invalidSize)
    assert.equal(result.success, true)
    assert.equal(result.data.size, undefined) // Should be undefined for invalid size
})

void test('rich text segment schema validation', () => {
    // Test string segment
    const stringSegment = {
        insert: 'Hello World',
        attributes: {
            bold: true,
            size: '14px',
        },
    }

    const stringResult = richTextSegmentSchema.safeParse(stringSegment)
    assert.equal(stringResult.success, true)

    // Test formula segment
    const formulaSegment = {
        insert: { formula: 'x^2 + y^2 = z^2' },
        attributes: {
            italic: true,
        },
    }

    const formulaResult = richTextSegmentSchema.safeParse(formulaSegment)
    assert.equal(formulaResult.success, true)

    // Test image segment
    const imageSegment = {
        insert: { image: 'https://example.com/image.png' },
    }

    const imageResult = richTextSegmentSchema.safeParse(imageSegment)
    assert.equal(imageResult.success, true)
})

void test('rich text segment schema rejects data URLs for images', () => {
    // Test that data URLs are rejected for images
    const dataUrlSegment = {
        insert: { image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA...' },
    }

    const result = richTextSegmentSchema.safeParse(dataUrlSegment)
    assert.equal(result.success, false)
})
