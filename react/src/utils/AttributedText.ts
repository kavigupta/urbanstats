import stableStringify from 'json-stable-stringify'
import { z } from 'zod'

import { Range } from '../urban-stats-script/editor-utils'

import { assert } from './defensive'

export type AttributedText = TextSegment[]

export type TextSegment = { kind: 'formula', formula: string, attributes: StringAttributes } | {
    kind: 'string'
    string: string
    attributes: StringAttributes
}

export const stringAttributeSchemas = {
    color: z.string(),
    fontSize: z.object({ kind: z.literal('pixels'), pixels: z.number() }).strict(),
    fontFamily: z.string(),
    fontWeight: z.enum(['normal', 'bold']),
    fontStyle: z.enum(['normal', 'italic']),
    textDecoration: z.enum(['none', 'underline']),
}

export const stringAttributesSchema = z.object(stringAttributeSchemas).strict()

export type StringAttributes = z.infer<typeof stringAttributesSchema>

export function segmentLength(segment: TextSegment): number {
    switch (segment.kind) {
        case 'formula':
            return 1
        case 'string':
            return segment.string.length
    }
}

function maybeMergeSegments(a: TextSegment, b: TextSegment): TextSegment | undefined {
    if (a.kind !== 'string' || b.kind !== 'string') {
        return undefined
    }
    if (stableStringify(a.attributes) === stableStringify(b.attributes)) {
        return {
            kind: 'string',
            string: a.string + b.string,
            attributes: a.attributes,
        }
    }
    return undefined
}

export function concat(texts: AttributedText[]): AttributedText {
    const result: AttributedText = []
    for (const text of texts) {
        for (const segment of text) {
            if (segmentLength(segment) === 0) {
                continue
            }
            let merged
            if (result.length > 0 && (merged = maybeMergeSegments(result[result.length - 1], segment)) !== undefined) {
                result[result.length - 1] = merged
            }
            else {
                result.push(segment)
            }
        }
    }
    return result
}

export function length(text: AttributedText): number {
    return text.reduce((l, t) => l + segmentLength(t), 0)
}

export function slice(text: AttributedText, range: Range): AttributedText {
    let i = 0
    const result: AttributedText = []
    for (const segment of text) {
        const segmentRange = { start: i, end: i + segmentLength(segment) }
        if (range.start >= segmentRange.end || range.end <= segmentRange.start) {
            // no intersection
        }
        else if (range.start <= segmentRange.start && range.end >= segmentRange.end) {
            // whole segment is in range
            result.push(segment)
        }
        else if (range.start <= segmentRange.start && range.end < segmentRange.end) {
            assert(segment.kind === 'string', 'other segments should have length 1')
            // we just get the beginning range of the segment
            result.push({ kind: 'string', string: segment.string.slice(0, range.end - i), attributes: segment.attributes })
        }
        else if (range.start > segmentRange.start && range.end >= segmentRange.end) {
            assert(segment.kind === 'string', 'other segments should have length 1')
            // we just get the end of the segment
            result.push({ kind: 'string', string: segment.string.slice(range.start - i), attributes: segment.attributes })
        }
        else if (range.start > segmentRange.start && range.end < segmentRange.end) {
            assert(segment.kind === 'string', 'other segments should have length 1')
            // we're clipping the middle of the segment
            result.push({ kind: 'string', string: segment.string.slice(range.start - i, range.end - i), attributes: segment.attributes })
        }
        else {
            throw new Error(`unhandled case ${JSON.stringify(range)} ${JSON.stringify(segmentRange)}`)
        }
        i += segmentLength(segment)
    }
    return result
}

export function replaceRange(dest: AttributedText, range: Range, src: AttributedText): AttributedText {
    return concat([
        slice(dest, { start: 0, end: range.start }),
        src,
        slice(dest, { start: range.end, end: length(dest) }),
    ])
}

export function replaceSelection(range: Range, replacementLength: number): Range {
    if (range.start === range.end) {
        return { start: range.start + replacementLength, end: range.end + replacementLength }
    }
    return { start: range.start, end: replacementLength + range.start }
}

export function charAt(text: AttributedText, i: number): string | undefined {
    assert(i >= 0 && i < length(text), 'cannot get character outside of text length')
    let segmentIdx = 0
    while (i - segmentLength(text[segmentIdx]) >= 0) {
        i -= segmentLength(text[segmentIdx])
        segmentIdx++
    }
    const segment = text[segmentIdx]
    switch (segment.kind) {
        case 'string':
            return segment.string.charAt(i)
        case 'formula':
            return undefined
    }
}

export function getAttributes(text: AttributedText, range: Range | null): StringAttributes {
    if (text.length === 0) {
        throw new Error('getting attribute of empty text')
    }

    if (range === null || range.end === length(text)) {
        return text[text.length - 1].attributes
    }

    const selectSegmentEnding: (segmentEnd: number) => boolean
    = range.start === range.end && (range.start === 0 || charAt(text, range.start - 1) !== '\n')
        ? segmentEnd => segmentEnd >= range.start
        : segmentEnd => segmentEnd > range.start

    let i = 0
    for (const segment of text) {
        i += segmentLength(segment)
        if (selectSegmentEnding(i)) {
            return segment.attributes
        }
    }
    throw new Error(`range end ${range.end} out of range of text length ${length(text)}`)
}

export function setAttributes(text: AttributedText, range: Range, values: Partial<StringAttributes>): AttributedText {
    // So that newlines don't get isolated
    if (range.end < length(text) && charAt(text, range.end) === '\n') {
        range = { start: range.start, end: range.end + 1 }
    }
    return concat([
        slice(text, { start: 0, end: range.start }),
        slice(text, range).map(segment => ({ ...segment, attributes: { ...segment.attributes, ...values } })),
        slice(text, { start: range.end, end: length(text) }),
    ])
}
