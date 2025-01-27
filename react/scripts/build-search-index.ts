import fs from 'fs'
import { gzipSync } from 'zlib'

import { z } from 'zod'
import { argumentParser } from 'zodcli'

import { normalize, tokenize } from '../src/search'
import { Haystack, toHaystack, toSignature } from '../src/utils/bitap'
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
    const tokens: Haystack[] = []
    const tokenIndexMap = new Map<string, number>()
    const entries = rawIndex.map(([element, priority]) => {
        const normalizedElement = normalize(element)
        const entryTokens = tokenize(normalizedElement)
        const tokenIndices = entryTokens.map((token) => {
            const existingTokenIndex = tokenIndexMap.get(token)
            if (existingTokenIndex !== undefined) {
                return existingTokenIndex
            }
            else {
                if (token.length > lengthOfLongestToken) {
                    lengthOfLongestToken = token.length
                }
                const haystack = toHaystack(token)
                const newTokenIndex = tokens.length
                tokenIndexMap.set(token, newTokenIndex)
                tokens.push(haystack)
                return newTokenIndex
            }
        })
        if (priority > maxPriority) {
            maxPriority = priority
        }
        if (tokenIndices.length > mostTokens) {
            mostTokens = tokenIndices.length
        }
        return {
            element,
            tokenIndices,
            priority,
            signature: toSignature(normalizedElement),
        }
    })
    return new SearchIndex({ entries, lengthOfLongestToken, maxPriority, mostTokens, tokens })
}
