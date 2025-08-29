export type Block = { type: 'single', ident: string } | { type: 'multi' }

export interface SingleLocationWithinBlock {
    lineIdx: number
    colIdx: number
    charIdx: number
}
export type SingleLocation = SingleLocationWithinBlock & { block: Block }

export interface LocInfo {
    start: SingleLocation
    end: SingleLocation
}

export const noLocation = { start: { block: { type: 'multi' }, lineIdx: 0, colIdx: 0, charIdx: 0 }, end: { block: { type: 'multi' }, lineIdx: 0, colIdx: 0, charIdx: 0 } } satisfies LocInfo
