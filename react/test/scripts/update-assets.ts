import { z } from 'zod'
import { argumentParser } from 'zodcli'

import { testsFromGlobs, updateReferences } from './util'

const options = argumentParser({
    options: z.object({
        test: z.array(z.string()).default(() => { throw new Error(`Missing --test=<glob> argument. E.g. npm run test:update-assets -- --test='test/*.test.ts'`) }),
    }).strict(),
}).parse(process.argv.slice(2))

for (const test of testsFromGlobs(options.test)) {
    await updateReferences(test)
}
