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
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Type Check
const typeCheck1: USSOp['attributes'] = defaultAttributes
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Type Check
const typeCheck2: typeof defaultAttributes = (undefined as unknown) as USSOp['attributes']

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
    })).default(defaultAttributes),
})

type USSOp = z.infer<typeof ussOpSchema>

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
        return [data]
    })
}
