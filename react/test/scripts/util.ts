import fs from 'fs/promises'

import { z } from 'zod'

export function booleanArgument({ defaultValue }: { defaultValue: boolean }): z.ZodDefault<z.ZodUnion<[z.ZodEffects<z.ZodLiteral<'true'>, boolean, 'true'>, z.ZodEffects<z.ZodLiteral<'false'>, boolean, 'false'>, z.ZodEffects<z.ZodNull, boolean, null>]>> {
    return z.union([
        z.literal('true').transform(() => true),
        z.literal('false').transform(() => false),
        z.null().transform(() => defaultValue),
    ]).default(null)
}

export async function getTOTPWait(testName: string): Promise<number> {
    try {
        return z.number().parse(JSON.parse(await fs.readFile(`totp_wait_time/${testName}.json`, 'utf-8')))
    }
    catch {
        return 0
    }
}

export async function setTOTPWait(testName: string, newValue: number): Promise<void> {
    await fs.mkdir('totp_wait_time', { recursive: true })
    await fs.writeFile(`totp_wait_time/${testName}.json`, JSON.stringify(newValue))
}
