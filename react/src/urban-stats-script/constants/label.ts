import { Delta } from 'quill'

export interface Label {
    bottomLeft: [number, number]
    topRight: [number, number]
    text: AttributedText
    backgroundColor: string
}

export type AttributedText = TextSegment[]

export interface TextSegment {
    string: string
    attributes: Record<string, unknown>
}

export function toQuillDelta(text: AttributedText): Delta {
    return new Delta(text.map(segment => ({ insert: segment.string, attributes: segment.attributes })))
}

export function fromQuillDelta(delta: Delta): AttributedText {
    return delta.ops.map((op) => {
        if (typeof op.insert === 'string') {
            return { string: op.insert, attributes: op.attributes ?? {} }
        }
        if (typeof op.insert === 'object') {
            // TODO
        }
        throw new Error(`Could not process op ${JSON.stringify(op)}`)
    })
}
