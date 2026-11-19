import { z } from 'zod'

export function testCafePorts(): [number, number] {
    const basePort = z.optional(z.coerce.number().int()).default(1337).parse(process.env.TESTCAFE_PORT)
    return [basePort, basePort + 1]
}
