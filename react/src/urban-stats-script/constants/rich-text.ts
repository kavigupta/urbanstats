import { z } from 'zod'

import { RemoveOptionals, SwapKeysValues } from '../../utils/types'
import { Context } from '../context'
import { createConstantExpression, NamedFunctionArgumentWithDocumentation, USSRawValue, USSType, USSValue } from '../types-values'

import { colorType } from './color'
import { Color, hexToColor } from './color-utils'

export type RichTextDocument = RichTextSegment[]

export function documentLength(document: RichTextDocument): number {
    return document.reduce((sum, segment) => sum + (typeof segment.insert === 'string' ? segment.insert.length : 1), 0)
}

export const richTextAttributesSchema = z.object({
    size: z.optional(z.string().transform((s) => {
        if (!s.endsWith('px')) {
            console.warn(`Font size ${s} does not end with "px"`)
            return undefined
        }
        const pixels = s.slice(0, s.length - 2)
        const result = parseFloat(pixels)
        if (!isFinite(result)) {
            console.warn(`Font pixels ${pixels} is not a valid number`)
            return undefined
        }
        return result
    })),
    font: z.optional(z.string()),
    color: z.optional(z.string().transform((c) => {
        try {
            return hexToColor(c)
        }
        catch {
            console.warn(`${c} is not a valid color`)
            return undefined
        }
    })),
    bold: z.optional(z.boolean()),
    italic: z.optional(z.boolean()),
    underline: z.optional(z.boolean()),
    strike: z.optional(z.boolean()),
    list: z.optional(z.union([z.literal('ordered'), z.literal('bullet'), z.literal('')])),
    indent: z.optional(z.number()),
    align: z.optional(z.enum(['', 'center', 'right', 'justify'])),
})

export const richTextSegmentSchema = z.object({
    insert: z.union([
        z.string(),
        z.object({ formula: z.string() }),
        z.object({ image: z.string().refine(link => !link.startsWith('data:')) }), // Images must be linked, not enough room to store them in the url
    ]),
    attributes: z.optional(richTextAttributesSchema),
})

export type RichTextSegment = z.infer<typeof richTextSegmentSchema>

export type RichTextAttributes = RemoveOptionals<RichTextSegment>['attributes']

export const richTextDocumentType = {
    type: 'opaque',
    name: 'richTextDocument',
} satisfies USSType

export const richTextSegmentType = {
    type: 'opaque',
    name: 'richTextSegment',
} satisfies USSType

export const constructRichTextDocumentValue: USSValue = {
    type: {
        type: 'function',
        posArgs: [
            { type: 'concrete', value: { type: 'vector', elementType: richTextSegmentType } },
        ],
        namedArgs: {},
        returnType: { type: 'concrete', value: richTextDocumentType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        let segmentsList = (posArgs[0] as { type: 'opaque', opaqueType: 'richTextSegment', value: RichTextSegment }[]).map(({ value }) => value)
        if (segmentsList.length === 0) {
            segmentsList = [{ insert: '\n' }] // bugs on applying attributes to empty text without this
        }
        return {
            type: 'opaque',
            opaqueType: 'richTextDocument',
            value: segmentsList,
        }
    },
    documentation: {
        humanReadableName: 'Rich Text Document',
        category: 'richText',
        longDescription: 'Creates a rich text document from a list of rich text segments.',
        selectorRendering: { kind: 'subtitleLongDescription' },
        customConstructor: true,
    },
} satisfies USSValue

export const richTextListType = {
    type: 'opaque',
    name: 'richTextList',
} satisfies USSType

export const richTextAlignType = {
    type: 'opaque',
    name: 'richTextAlign',
} satisfies USSType

const attributesNamedArgs: { [K in keyof RemoveOptionals<RichTextSegment>['attributes']]-?: NamedFunctionArgumentWithDocumentation } = {
    size: {
        type: { type: 'concrete', value: { type: 'number' } },
        defaultValue: createConstantExpression(null),
    },
    font: {
        type: { type: 'concrete', value: { type: 'string' } },
        defaultValue: createConstantExpression(null),
    },
    color: {
        type: { type: 'concrete', value: colorType },
        defaultValue: createConstantExpression(null),
    },
    bold: {
        type: { type: 'concrete', value: { type: 'boolean' } },
        defaultValue: createConstantExpression(null),
    },
    italic: {
        type: { type: 'concrete', value: { type: 'boolean' } },
        defaultValue: createConstantExpression(null),
    },
    underline: {
        type: { type: 'concrete', value: { type: 'boolean' } },
        defaultValue: createConstantExpression(null),
    },
    strike: {
        type: { type: 'concrete', value: { type: 'boolean' } },
        defaultValue: createConstantExpression(null),
    },
    list: {
        type: { type: 'concrete', value: richTextListType },
        defaultValue: createConstantExpression(null),
    },
    indent: {
        type: { type: 'concrete', value: { type: 'number' } },
        defaultValue: createConstantExpression(null),
    },
    align: {
        type: { type: 'concrete', value: richTextAlignType },
        defaultValue: createConstantExpression(null),
    },
}

function attributesFromNamedArgs(namedArgs: Record<string, USSRawValue>): RichTextSegment['attributes'] {
    const color = (namedArgs.color as ({ value: Color } | null))?.value

    const entries = Object.entries({
        size: (namedArgs.size as number | null) ?? undefined,
        font: (namedArgs.font as string | null) ?? undefined,
        color,
        bold: (namedArgs.bold as boolean | null) ?? undefined,
        italic: (namedArgs.italic as boolean | null) ?? undefined,
        underline: (namedArgs.underline as boolean | null) ?? undefined,
        list: (namedArgs.list as { value: RichTextAttributes['list'] } | null)?.value,
        indent: (namedArgs.indent as number | null) ?? undefined,
        align: (namedArgs.align as { value: RichTextAttributes['align'] } | null)?.value,
        strike: (namedArgs.strike as boolean | null) ?? undefined,
    }).filter(([, v]) => v !== undefined)

    if (entries.length === 0) {
        return undefined
    }

    return Object.fromEntries(entries)
}

const richTextSegmentConstructorType: USSType = {
    type: 'function',
    posArgs: [
        { type: 'concrete', value: { type: 'string' } },
    ],
    namedArgs: attributesNamedArgs,
    returnType: { type: 'concrete', value: richTextSegmentType },
}

export const constructRichTextStringSegmentValue: USSValue = {
    type: richTextSegmentConstructorType,
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const text = posArgs[0] as string
        const attributes = attributesFromNamedArgs(namedArgs)
        return {
            type: 'opaque',
            opaqueType: 'richTextSegment',
            value: {
                insert: text,
                ...(attributes && { attributes }),
            },
        }
    },
    documentation: {
        humanReadableName: 'Rich Text String Segment',
        category: 'richText',
        longDescription: 'Creates a rich text segment containing a plain string. The string can have optional formatting attributes.',
        selectorRendering: { kind: 'subtitleLongDescription' },
        customConstructor: true,
    },
} satisfies USSValue

export const constructRichTextFormulaSegmentValue: USSValue = {
    type: richTextSegmentConstructorType,
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const formula = posArgs[0] as string
        const attributes = attributesFromNamedArgs(namedArgs)
        return {
            type: 'opaque',
            opaqueType: 'richTextSegment',
            value: {
                insert: { formula },
                ...(attributes && { attributes }),
            },
        }
    },
    documentation: {
        humanReadableName: 'Rich Text Formula Segment',
        category: 'richText',
        longDescription: 'Creates a rich text segment containing a formula. The formula is represented as a string and can have optional formatting attributes.',
        selectorRendering: { kind: 'subtitleLongDescription' },
        customConstructor: true,
    },
} satisfies USSValue

export const constructRichTextImageSegmentValue: USSValue = {
    type: richTextSegmentConstructorType,
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const image = posArgs[0] as string
        const attributes = attributesFromNamedArgs(namedArgs)
        return {
            type: 'opaque',
            opaqueType: 'richTextSegment',
            value: {
                insert: { image },
                ...(attributes && { attributes }),
            },
        }
    },
    documentation: {
        humanReadableName: 'Rich Text Image Segment',
        category: 'richText',
        longDescription: 'Creates a rich text segment containing an image. The image is represented as a URL string and can have optional formatting attributes.',
        selectorRendering: { kind: 'subtitleLongDescription' },
        customConstructor: true,
    },
} satisfies USSValue

export const alignIdentifierToValue = {
    alignLeft: '',
    alignCenter: 'center',
    alignRight: 'right',
    alignJustify: 'justify',
} as const

export const alignValueToIdentifer: SwapKeysValues<typeof alignIdentifierToValue> = {
    '': 'alignLeft',
    'center': 'alignCenter',
    'right': 'alignRight',
    'justify': 'alignJustify',
}

function alignConstant(value: RichTextAttributes['align']): USSValue {
    return {
        type: richTextAlignType,
        value: { type: 'opaque', opaqueType: 'richTextAlign', value },
        documentation: {
            humanReadableName: `Align ${value === '' ? 'Left' : value.charAt(0).toUpperCase() + value.slice(1)}`,
            category: 'richText',
            longDescription: `Specifies the alignment of the text as ${value === '' ? 'left' : value}.`,
            selectorRendering: { kind: 'subtitleLongDescription' },
            customConstructor: false,
        },
    }
}

export const listIdentifierToValue = {
    listOrdered: 'ordered',
    listBullet: 'bullet',
    listNone: '',
} as const

export const listValueToIdentifier: SwapKeysValues<typeof listIdentifierToValue> = {
    ordered: 'listOrdered',
    bullet: 'listBullet',
    ['']: 'listNone',
}

function listConstant(value: RichTextAttributes['list']): USSValue {
    return {
        type: richTextListType,
        value: { type: 'opaque', opaqueType: 'richTextList', value },
        documentation: {
            humanReadableName: `List ${(value && value.charAt(0).toUpperCase() + value.slice(1)) || 'None'}`,
            category: 'richText',
            longDescription: `Specifies the list type as ${value || 'none'}.`,
            selectorRendering: { kind: 'subtitleLongDescription' },
            customConstructor: false,
        },
    }
}

export const richTextConstants: [string, USSValue][] = [
    ['rtfDocument', constructRichTextDocumentValue],
    ['rtfString', constructRichTextStringSegmentValue],
    ['rtfFormula', constructRichTextFormulaSegmentValue],
    ['rtfImage', constructRichTextImageSegmentValue],
    ...Object.entries(alignIdentifierToValue).map(([id, value]) => [id, alignConstant(value)] satisfies [unknown, unknown]),
    ...Object.entries(listIdentifierToValue).map(([id, value]) => [id, listConstant(value)] satisfies [unknown, unknown]),
]
