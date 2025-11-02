import { Delta } from 'quill'
import { z } from 'zod'

import { colorThemes } from '../../page_template/color-themes'

interface USSOp {
    insert: string | { formula: string }
    attributes: {
        size: string
        font: string
        color: string
        bold: boolean
        italic: boolean
        underline: boolean
        list: false | 'ordered' | 'bullet'
    }
}

export const defaultAttributes: USSOp['attributes'] = {
    size: `16px`,
    font: 'Jost',
    color: colorThemes['Light Mode'].textMain,
    bold: false,
    italic: false,
    underline: false,
    list: false,
}

export interface Label {
    bottomLeft: [number, number]
    topRight: [number, number]
    text: AttributedText
    backgroundColor: string
    borderColor: string
    borderWidth: number
}

export type AttributedText = USSOp[]

const ussOpSchema = z.object({
    insert: z.union([z.string(), z.object({ formula: z.string() })]),
    attributes: z.optional(z.object({
        size: z.optional(z.string()).default(defaultAttributes.size),
        font: z.optional(z.string()).default(defaultAttributes.font),
        color: z.optional(z.string()).default(defaultAttributes.color),
        bold: z.optional(z.boolean()).default(defaultAttributes.bold),
        italic: z.optional(z.boolean()).default(defaultAttributes.italic),
        underline: z.optional(z.boolean()).default(defaultAttributes.underline),
        list: z.optional(z.union([z.literal('ordered'), z.literal('bullet'), z.literal(false)])).default(defaultAttributes.list),
    })).default(defaultAttributes),
})

export function toQuillDelta(text: AttributedText): Delta {
    return new Delta(text)
}

export function fromQuillDelta(delta: Delta): AttributedText {
    return delta.ops.flatMap((op) => {
        const { success, data } = ussOpSchema.safeParse(op)
        if (!success) {
            console.warn(`Couldn't parse Quill Op ${JSON.stringify(op)}`)
            return []
        }
        const droppedAttributes = Object.entries(op.attributes ?? {}).filter(
            ([key]) => !(key in data.attributes),
        )
        if (droppedAttributes.length > 0) {
            console.warn(`Dropped attributes: ${droppedAttributes.join(', ')}`)
        }
        return [data]
    })
}
