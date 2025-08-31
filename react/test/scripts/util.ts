import fs from 'fs/promises'

import { z } from 'zod'

export function booleanArgument({ defaultValue }: { defaultValue: boolean }): typeof result {
    const result = z.optional(z.union([
        z.literal('true').transform(() => true),
        z.literal('false').transform(() => false),
        z.null().transform(() => true),
    ])).default(defaultValue ? 'true' : 'false')
    return result
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
