import { z } from 'zod'

// Don't make backwards incompatible changes
const autoUXMetadataSchema = z.object({
    collapsed: z.optional(z.boolean()),
})

export type AutoUXMetadata = z.infer<typeof autoUXMetadataSchema>

export function getAutoUXMetadata(str: string): AutoUXMetadata {
    try {
        return autoUXMetadataSchema.parse(JSON.parse(str))
    }
    catch {
        return {}
    }
}
