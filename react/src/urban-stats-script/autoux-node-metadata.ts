import { z } from 'zod'

// Don't make backwards incompatible changes
const autoUXNodeMetadataSchema = z.object({
    collapsed: z.optional(z.boolean()),
})

export type AutoUXNodeMetadata = z.infer<typeof autoUXNodeMetadataSchema>

export function getAutoUXNodeMetadata(str: string): AutoUXNodeMetadata {
    try {
        return autoUXNodeMetadataSchema.parse(JSON.parse(str))
    }
    catch {
        return {}
    }
}
