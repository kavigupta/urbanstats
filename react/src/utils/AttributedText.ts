import stableStringify from 'json-stable-stringify'
import { z } from 'zod'

import { Range } from '../urban-stats-script/editor-utils'

export type AttributedText = TextSegment[]

export interface TextSegment {
    string: string
    attributes: TextAttributes
}

export const textAttributeSchemas = {
    color: z.string(),
    fontSize: z.object({ pixels: z.number() }).strict(),
    fontFamily: z.string(),
    fontWeight: z.enum(['normal', 'bold']),
    fontStyle: z.enum(['normal', 'italic']),
    textDecoration: z.enum(['none', 'underline']),
}

export const textAttributesSchema = z.object(textAttributeSchemas).strict()

export type TextAttributes = z.infer<typeof textAttributesSchema>

export function concat(texts: AttributedText[]): AttributedText {
    const result: AttributedText = []
    for (const text of texts) {
        for (const segment of text) {
            if (segment.string.length === 0) {
                continue
            }
            if (result.length > 0 && stableStringify(result[result.length - 1].attributes) === stableStringify(segment.attributes)) {
                result[result.length - 1].string = result[result.length - 1].string + segment.string
            }
            else {
                result.push(segment)
            }
        }
    }
    return result
}

export function length(text: AttributedText): number {
    return text.reduce((l, t) => l + t.string.length, 0)
}

export function slice(text: AttributedText, range: Range): AttributedText {
    let i = 0
    const result: AttributedText = []
    for (const segment of text) {
        const segmentRange = { start: i, end: i + segment.string.length }
        if (range.start >= segmentRange.end || range.end <= segmentRange.start) {
            // no intersection
        }
        else if (range.start <= segmentRange.start && range.end >= segmentRange.end) {
            // whole segment is in range
            result.push(segment)
        }
        else if (range.start <= segmentRange.start && range.end < segmentRange.end) {
            // we just get the beginning range of the segment
            result.push({ string: segment.string.slice(0, range.end - i), attributes: segment.attributes })
        }
        else if (range.start > segmentRange.start && range.end >= segmentRange.end) {
            // we just get the end of the segment
            result.push({ string: segment.string.slice(range.start - i), attributes: segment.attributes })
        }
        else if (range.start > segmentRange.start && range.end < segmentRange.end) {
            // we're clipping the middle of the segment
            result.push({ string: segment.string.slice(range.start - i, range.end - i), attributes: segment.attributes })
        }
        else {
            throw new Error(`unhandled case ${JSON.stringify(range)} ${JSON.stringify(segmentRange)}`)
        }
        i += segment.string.length
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

export function getString(text: AttributedText): string {
    return text.reduce((s, t) => s + t.string, '')
}

export function getAttributes(text: AttributedText, range: Range | null): TextAttributes {
    if (text.length === 0) {
        throw new Error('getting attribute of empty text')
    }

    if (range === null || range.end === length(text)) {
        return text[text.length - 1].attributes
    }

    const selectSegmentEnding: (segmentEnd: number) => boolean
    = range.start === range.end && (range.start === 0 || getString(text).charAt(range.start - 1) !== '\n')
        ? segmentEnd => segmentEnd >= range.start
        : segmentEnd => segmentEnd > range.start

    let i = 0
    for (const segment of text) {
        i += segment.string.length
        if (selectSegmentEnding(i)) {
            return segment.attributes
        }
    }
    throw new Error(`range end ${range.end} out of range of text length ${length(text)}`)
}

export function setAttributes(text: AttributedText, range: Range, values: Partial<TextAttributes>): AttributedText {
    // So that newlines don't get isolated
    if (range.end < length(text) && getString(slice(text, { start: range.end, end: range.end + 1 })) === '\n') {
        range = { start: range.start, end: range.end + 1 }
    }
    return concat([
        slice(text, { start: 0, end: range.start }),
        slice(text, range).map(segment => ({ ...segment, attributes: { ...segment.attributes, ...values } })),
        slice(text, { start: range.end, end: length(text) }),
    ])
}
