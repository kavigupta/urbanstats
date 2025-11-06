import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { doRender } from '../../urban-stats-script/constants/color-utils'
import { deconstruct as deconstructInset, Inset } from '../../urban-stats-script/constants/insets'
import { RichTextDocument, RichTextSegment } from '../../urban-stats-script/constants/rich-text'
import { TextBox } from '../../urban-stats-script/constants/text-box'
import * as l from '../../urban-stats-script/literal-parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { loadInsetExpression } from '../../urban-stats-script/worker'
import { ArrayEdits, replace, swap } from '../../utils/array-edits'
import { assert } from '../../utils/defensive'

import { colorSchema } from './Selector'
import { idOutput, MapUSS, validMapperOutputs } from './TopLevelEditor'
import { neswSchema } from './edit-insets'
import { MapSettings } from './utils'

const attributesArgs = {
    size: l.optional(l.number()),
    font: l.optional(l.string()),
    color: l.optional(l.transformExpr(colorSchema, color => color && doRender(color.color))),
    bold: l.optional(l.boolean()),
    italic: l.optional(l.boolean()),
    underline: l.optional(l.boolean()),
    list: l.optional(l.transformExpr(l.union([l.identifier('listOrdered'), l.identifier('listBullet')]), list => (({ listOrdered: 'ordered', listBullet: 'bullet' } as const)[list]))),
    indent: l.optional(l.number()),
    align: l.optional(l.transformExpr(l.union([l.identifier('alignLeft'), l.identifier('alignCenter'), l.identifier('alignRight'), l.identifier('alignJustify')]), align => (({ alignLeft: '', alignCenter: 'center', alignRight: 'right', alignJustify: 'justify' } as const)[align]))),
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
    // eslint-disable-next-line no-restricted-syntax -- Other ways of doing this are very annoying
    backgroundColor: l.transformExpr(l.optional(colorSchema), color => (color && doRender(color.color)) ?? '#fff'),
    // eslint-disable-next-line no-restricted-syntax -- Other ways of doing this are very annoying
    borderColor: l.transformExpr(l.optional(colorSchema), color => (color && doRender(color.color)) ?? '#000'),
    borderWidth: l.transformExpr(l.optional(l.number()), borderWidth => borderWidth ?? 1),
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
]), (uss) => {
    const textBoxesArg = uss[1].rest[0].namedArgs.textBoxes
    const literalTextBoxes = textBoxesArg.currentValue ?? null
    return {
        ...textBoxesArg,
        currentValue: literalTextBoxes,
    }
})

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

export interface InsetEdits {
    insets: ArrayEdits<Inset>
    ast: ArrayEdits<UrbanStatsASTExpression>
}

export function replaceInsets(edits: InsetEdits, [from, to]: [number, number], withArray: Inset[]): InsetEdits {
    return {
        insets: replace(edits.insets, [from, to], withArray),
        ast: replace(edits.ast, [from, to], withArray.map(deconstructInset)),
    }
}

export function swapInsets(edits: InsetEdits, indexA: number, indexB: number): InsetEdits {
    return {
        insets: swap(edits.insets, indexA, indexB),
        ast: swap(edits.ast, indexA, indexB),
    }
}

export function doEditInsets(settings: MapSettings, edits: InsetEdits, typeEnvironment: TypeEnvironment): MapUSS {
    assert(settings.script.uss.type === 'statements', 'Trying to do an inset edit on USS that is not inset editable')
    const mapInsets = mapSchema.parse(settings.script.uss, typeEnvironment)
    assert(mapInsets !== undefined && (mapInsets.currentValue !== null || settings.universe !== undefined), 'Trying to do an inset edit on USS that is not inset editable')

    let currentInsetsAst: UrbanStatsASTExpression
    if (mapInsets.currentValue !== null) {
        currentInsetsAst = mapInsets.expr!
    }
    else {
        currentInsetsAst = loadInsetExpression(settings.universe!)
    }

    const newConstructInsets = constructInsetsSchema.parse(currentInsetsAst, typeEnvironment)!.edit(edits.ast) as UrbanStatsASTExpression

    const result = mapInsets.edit(newConstructInsets)
    return result as MapUSS
}
