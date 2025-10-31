import { colorThemes } from '../page_template/color-themes'
import { Range } from '../urban-stats-script/editor-utils'

export type AttributedText = TextSegment[]

export interface TextSegment {
    string: string
    attributes: {
        color: string
        fontSize: { pixels: number }
    }
}

export function length(text: AttributedText): number {
    return text.reduce((l, t) => l + t.string.length, 0)
}

export const defaultAttributes: TextSegment['attributes'] = {
    color: colorThemes['Light Mode'].textMain,
    fontSize: { pixels: 16 },
}

export function getAttribute<K extends keyof TextSegment['attributes']>(text: AttributedText, range: Range | null, attribute: K): TextSegment['attributes'][K] {
    if (text.length === 0) {
        return defaultAttributes[attribute]
    }
    if (range === null) {
        return text[text.length - 1].attributes[attribute]
    }

    let i = 0
    for (const segment of text) {
        i += segment.string.length
        if (i >= range.end) {
            return segment.attributes[attribute]
        }
    }
    throw new Error(`range end ${range.end} out of range of text length ${length(text)} when getting attribute ${attribute}`)
}

export function setAttribute<K extends keyof TextSegment['attributes']>(text: AttributedText, range: Range, attribute: K, value: TextSegment['attributes'][K]): AttributedText {
    let i = 0
    const result: AttributedText = []
    for (const segment of text) {
        const segmentRange = { start: i, end: i + segment.string.length }
        if (range.start >= segmentRange.end || range.end <= segmentRange.start) {
            // no intersection
            result.push(segment)
        }
        else if (range.start <= segmentRange.start && range.end >= segmentRange.end) {
            // we change the whole segment
            result.push({ string: segment.string, attributes: { ...segment.attributes, [attribute]: value } })
        }
        else if (range.start <= segmentRange.start && range.end < segmentRange.end) {
            // we just get the beginning range of the segment
            result.push({ string: segment.string.slice(0, range.end - i), attributes: { ...segment.attributes, [attribute]: value } })
            result.push({ string: segment.string.slice(range.end - i), attributes: segment.attributes })
        }
        else if (range.start > segmentRange.start && range.end >= segmentRange.end) {
            // we just get the end of the segment
            result.push({ string: segment.string.slice(0, range.start - i), attributes: segment.attributes })
            result.push({ string: segment.string.slice(range.start - i), attributes: { ...segment.attributes, [attribute]: value } })
        }
        else if (range.start > segmentRange.start && range.end < segmentRange.end) {
            // we're clipping the middle of the segment
            result.push({ string: segment.string.slice(0, range.start - i), attributes: segment.attributes })
            result.push({ string: segment.string.slice(range.start - i, range.end - i), attributes: { ...segment.attributes, [attribute]: value } })
            result.push({ string: segment.string.slice(range.end - i), attributes: segment.attributes })
        }
        else {
            throw new Error(`unhandled case ${JSON.stringify(range)} ${JSON.stringify(segmentRange)}`)
        }
        i += segment.string.length
    }
    return result
}
