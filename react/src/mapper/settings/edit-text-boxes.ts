import { alignIdentifierToValue, listIdentifierToValue, RichTextDocument, RichTextSegment } from '../../urban-stats-script/constants/rich-text'
import { deconstruct, defaults, TextBox } from '../../urban-stats-script/constants/text-box'
import * as l from '../../urban-stats-script/literal-parser'
import { noLocation } from '../../urban-stats-script/location'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { assert } from '../../utils/defensive'

import { colorSchema } from './Selector'
import { idOutput, MapUSS, validMapperOutputs } from './TopLevelEditor'
import { neswSchema } from './edit-insets'
import { MapSettings } from './utils'

const attributesArgs = {
    size: l.optional(l.number()),
    font: l.optional(l.string()),
    color: l.optional(l.transformExpr(colorSchema, color => color?.color)),
    bold: l.optional(l.boolean()),
    italic: l.optional(l.boolean()),
    underline: l.optional(l.boolean()),
    list: l.optional(l.transformExpr(l.union(Object.keys(listIdentifierToValue).map(l.identifier)), align => listIdentifierToValue[align])),
    indent: l.optional(l.number()),
    align: l.optional(l.transformExpr(l.union(Object.keys(alignIdentifierToValue).map(l.identifier)), align => alignIdentifierToValue[align])),
}

const richTextSegmentSchema = l.union([
    l.transformExpr(l.call({ fn: l.identifier('rtfString'), unnamedArgs: [l.string()], namedArgs: attributesArgs }), call => ({
        insert: call.unnamedArgs[0],
        attributes: call.namedArgs,
    } satisfies RichTextSegment)),
])

const richTextDocumentSchema = l.transformExpr(l.call({ fn: l.identifier('rtfDocument'), unnamedArgs: [l.vector(richTextSegmentSchema)], namedArgs: {} }),
    ({ unnamedArgs }) => (unnamedArgs[0] satisfies RichTextDocument))

const textBoxSchema = l.transformExpr(l.call({ fn: l.identifier('textBox'), unnamedArgs: [], namedArgs: {
    screenBounds: neswSchema,
    text: richTextDocumentSchema,
    backgroundColor: l.transformExpr(l.optional(colorSchema), color => color?.color ?? defaults.backgroundColor),
    borderColor: l.transformExpr(l.optional(colorSchema), color => color?.color ?? defaults.borderColor),
    borderWidth: l.transformExpr(l.optional(l.number()), borderWidth => borderWidth ?? defaults.borderWidth),
} }),
({ namedArgs: { screenBounds, ...rest } }) => ({
    bottomLeft: [screenBounds.west, screenBounds.south],
    topRight: [screenBounds.east, screenBounds.north],
    ...rest,
} satisfies TextBox))

const mapSchema = l.transformStmt(l.statements([
    l.ignore(),
    l.condition({
        condition: l.ignore(),
        rest: [
            l.expression(l.reparse(idOutput, validMapperOutputs,
                l.call({
                    fn: l.ignore(),
                    unnamedArgs: [],
                    namedArgs: {
                        textBoxes: l.edit(l.optional(l.vector(textBoxSchema))),
                    },
                }))),
        ],
    }),
]), uss => uss[1].rest[0].namedArgs.textBoxes)

export function getTextBoxes(settings: MapSettings, typeEnvironment: TypeEnvironment): TextBox[] | undefined {
    if (settings.script.uss.type === 'statements') {
        try {
            return mapSchema.parse(settings.script.uss, typeEnvironment).currentValue ?? []
        }
        catch {
            return undefined
        }
    }
    return undefined
}

export function scriptWithNewTextBoxes(settings: MapSettings, textBoxes: TextBox[], typeEnvironment: TypeEnvironment): MapUSS {
    assert(settings.script.uss.type === 'statements', 'Trying to do an inset edit on USS that is not inset editable')
    const result = mapSchema.parse(settings.script.uss, typeEnvironment).edit({
        type: 'vectorLiteral',
        elements: textBoxes.map(deconstruct),
        entireLoc: noLocation,
    })
    return result as MapUSS
}
