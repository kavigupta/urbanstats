import { Delta } from 'quill'
import { z } from 'zod'

export type RichText = RichTextOp[]

const richTextOpSchema = z.object({
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
        align: z.optional(z.enum(['', 'center', 'right', 'justify'])),
    })),
})

export type RichTextOp = z.infer<typeof richTextOpSchema>

export function toQuillDelta(text: RichText): Delta {
    return new Delta(text)
}

export function fromQuillDelta(delta: Delta): RichText {
    return delta.ops.flatMap((op) => {
        const { success, data } = richTextOpSchema.safeParse(op)
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
