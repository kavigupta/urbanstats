import fs from 'fs'
import { gzipSync } from 'zlib'

import { z } from 'zod'
import { argumentParser } from 'zodcli'

import { normalize, tokenize } from '../src/search'
import { toHaystack, toSignature } from '../src/utils/bitap'
import { SearchIndex } from '../src/utils/protos'

const options = argumentParser({
    options: z.object({
        input: z.string(),
        output: z.string(),
    }).strict(),
}).parse(process.argv.slice(2))

const elements = JSON.parse(fs.readFileSync(options.input).toString()) as [string, number][]

const proto = processRawSearchIndex(elements)

const data = gzipSync(SearchIndex.encode(proto).finish())

fs.writeFileSync(options.output, data)

function processRawSearchIndex(rawIndex: [string, number][]): SearchIndex {
    let lengthOfLongestToken = 0
    let maxPriority = 0
    let mostTokens = 0
    const entries = rawIndex.map(([element, priority]) => {
        const normalizedElement = normalize(element)
        const tokens = tokenize(normalizedElement)
        const haystacks = tokens.map((token) => {
            if (token.length > lengthOfLongestToken) {
                lengthOfLongestToken = token.length
            }
            return toHaystack(token)
        })
        if (priority > maxPriority) {
            maxPriority = priority
        }
        if (haystacks.length > mostTokens) {
            mostTokens = haystacks.length
        }
        return {
            element,
            tokens: haystacks,
            priority,
            signature: toSignature(normalizedElement),
        }
    })
    return new SearchIndex({ entries, lengthOfLongestToken, maxPriority, mostTokens })
}
