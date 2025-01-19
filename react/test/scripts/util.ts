import { z } from 'zod'

export function booleanArgument({ defaultValue }: { defaultValue: boolean }): z.ZodDefault<z.ZodUnion<[z.ZodEffects<z.ZodLiteral<'true'>, boolean, 'true'>, z.ZodEffects<z.ZodLiteral<'false'>, boolean, 'false'>, z.ZodEffects<z.ZodNull, boolean, null>]>> {
    return z.union([
        z.literal('true').transform(() => true),
        z.literal('false').transform(() => false),
        z.null().transform(() => defaultValue),
    ]).default(null)
}
