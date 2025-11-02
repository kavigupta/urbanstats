import { Delta } from 'quill'
import { z } from 'zod'

import { colorThemes } from '../../page_template/color-themes'

export const defaultAttributes = {
    size: `16px`,
    font: 'Jost',
    color: colorThemes['Light Mode'].textMain,
    bold: false,
    italic: false,
    underline: false,
    list: false,
    indent: 0,
} satisfies LabelTextOp['attributes']

export interface Label {
    bottomLeft: [number, number]
    topRight: [number, number]
    text: LabelText
    backgroundColor: string
    borderColor: string
    borderWidth: number
}

export type LabelText = LabelTextOp[]

const labelTextOpSchema = z.object({
    insert: z.union([
        z.string(),
        z.object({ formula: z.string() }),
        z.object({ image: z.string().startsWith('data:') }), // Require data: prefix, otherwise loading remote images is a security problem
    ]),
    attributes: z.optional(z.object({
        size: z.optional(z.string()),
        font: z.optional(z.string()),
        color: z.optional(z.string()),
        bold: z.optional(z.boolean()),
        italic: z.optional(z.boolean()),
        underline: z.optional(z.boolean()),
        list: z.optional(z.union([z.literal('ordered'), z.literal('bullet'), z.literal(false)])),
        indent: z.optional(z.number()),
    })),
})

export type LabelTextOp = z.infer<typeof labelTextOpSchema>

export function toQuillDelta(text: LabelText): Delta {
    return new Delta(text)
}

export function fromQuillDelta(delta: Delta): LabelText {
    return delta.ops.flatMap((op) => {
        const { success, data } = labelTextOpSchema.safeParse(op)
        if (!success) {
            console.warn(`Couldn't parse Quill Op ${JSON.stringify(op)}`)
            return []
        }
        const droppedAttributes = Object.entries(op.attributes ?? {}).filter(
            ([key]) => !(key in (data.attributes ?? {})),
        )
        if (droppedAttributes.length > 0) {
            console.warn(`Dropped attributes: ${droppedAttributes.join(', ')}`)
        }
        return [data]
    })
}
