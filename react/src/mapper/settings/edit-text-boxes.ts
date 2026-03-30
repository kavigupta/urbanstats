import { alignIdentifierToValue, listIdentifierToValue, RichTextDocument, RichTextSegment } from '../../urban-stats-script/constants/rich-text'
import { deconstruct, defaults, TextBox } from '../../urban-stats-script/constants/text-box'
import * as l from '../../urban-stats-script/literal-parser'
import { noLocation } from '../../urban-stats-script/location'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { assert } from '../../utils/defensive'

import { colorSchema } from './Selector'
import { neswSchema } from './edit-insets'
import { MapUSS, mapUssParser, validMapperOutputs } from './map-uss'
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

const segmentTypes: [string, (insert: string) => RichTextSegment['insert']][] = [['rtfString', i => i], ['rtfFormula', formula => ({ formula })], ['rtfImage', image => ({ image })]]

const richTextSegmentSchema = l.union(segmentTypes.map(([fnId, insert]) =>
    l.transformExpr(l.call({ fn: l.identifier(fnId), unnamedArgs: [l.string()], namedArgs: attributesArgs }), call => ({
        insert: insert(call.unnamedArgs[0]),
        attributes: call.namedArgs,
    } satisfies RichTextSegment)),
))

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

const mapSchema = mapUssParser(l.call({
    fn: l.ignore(),
    unnamedArgs: [],
    namedArgs: {
        textBoxes: l.edit(l.optional(l.maybeAutoUXNode(l.vector(textBoxSchema)))),
    },
}), validMapperOutputs)

export function getTextBoxes(settings: MapSettings, typeEnvironment: TypeEnvironment): TextBox[] | undefined {
    if (settings.script.uss.type === 'statements') {
        try {
            return mapSchema(settings.script.uss, typeEnvironment).namedArgs.textBoxes.currentValue?.expr ?? []
        }
        catch (err) {
            if (err instanceof l.LiteralParseError) {
                return undefined
            }
            else {
                throw err
            }
        }
    }
    return undefined
}

export function scriptWithNewTextBoxes(settings: MapSettings, textBoxes: TextBox[], typeEnvironment: TypeEnvironment): MapUSS {
    assert(settings.script.uss.type === 'statements', 'Trying to do an text boxes edit on USS that is not text boxes editable')
    const parsed = mapSchema(settings.script.uss, typeEnvironment).namedArgs.textBoxes
    const result = parsed.edit(textBoxes.length === 0
        ? undefined
        : {
                type: 'autoUXNode',
                expr: {
                    type: 'vectorLiteral',
                    elements: textBoxes.map(deconstruct),
                    entireLoc: noLocation,
                },
                metadata: {
                    ...parsed.currentValue?.metadata,
                    collapsed: parsed.currentValue?.metadata.collapsed ?? parsed.expr === undefined,
                },
                entireLoc: noLocation,
            })
    return result as MapUSS
}
