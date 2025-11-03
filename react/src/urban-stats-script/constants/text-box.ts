import { Context } from '../context'
import { parseNoErrorAsExpression } from '../parser'
import { USSRawValue, USSType, USSValue } from '../types-values'

import { colorType, doRender } from './color'
import { Color } from './color-utils'
import { boundsType } from './insets'
import { RichTextDocument, richTextDocumentType } from './rich-text'

export interface TextBox {
    bottomLeft: [number, number]
    topRight: [number, number]
    text: RichTextDocument
    backgroundColor: string
    borderColor: string
    borderWidth: number
}

export const textBoxType = {
    type: 'opaque',
    name: 'textBox',
} satisfies USSType

export const constructTextBoxValue: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            screenBounds: { type: { type: 'concrete', value: boundsType } },
            text: { type: { type: 'concrete', value: richTextDocumentType } },
            backgroundColor: { type: { type: 'concrete', value: colorType }, defaultValue: parseNoErrorAsExpression('colorWhite', '') },
            borderColor: { type: { type: 'concrete', value: colorType }, defaultValue: parseNoErrorAsExpression('colorBlack', '') },
            borderWidth: { type: { type: 'concrete', value: { type: 'number' } }, defaultValue: parseNoErrorAsExpression('1', '') },
        },
        returnType: { type: 'concrete', value: textBoxType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const screenBounds = namedArgs.screenBounds as Map<string, USSRawValue>

        const text = (namedArgs.text as { type: 'opaque', opaqueType: 'richTextDocument', value: RichTextDocument }).value
        const backgroundColor = doRender((namedArgs.backgroundColor as { type: 'opaque', opaqueType: 'color', value: Color }).value)
        const borderColor = doRender((namedArgs.borderColor as { type: 'opaque', opaqueType: 'color', value: Color }).value)
        const borderWidth = namedArgs.borderWidth as number

        return {
            type: 'opaque',
            opaqueType: 'textBox',
            value: {
                bottomLeft: [screenBounds.get('west') as number, screenBounds.get('south') as number],
                topRight: [screenBounds.get('east') as number, screenBounds.get('north') as number],
                text,
                backgroundColor,
                borderColor,
                borderWidth,
            },
        }
    },
    documentation: {
        humanReadableName: 'Map Text Box',
        category: 'map',
        longDescription: 'Create a text box on the map with specified screen bounds (bounding box of the inset on the screen, where bottom left corner has (0, 0) and top right corner has (1, 1))',
        selectorRendering: { kind: 'subtitleLongDescription' },
        customConstructor: true,
    },
} satisfies USSValue
