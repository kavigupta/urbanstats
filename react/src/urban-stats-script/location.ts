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

export function extendBlockIdPositionalArg(blockIdent: string, position: number): string {
    return `${blockIdent}_pos_${position}`
}

export function extendBlockIdKwarg(blockIdent: string, argName: string): string {
    return `${blockIdent}_${argName}`
}

export function extendBlockIdVectorElement(blockIdent: string, index: number): string {
    return `${blockIdent}_el_${index}`
}

export function extendBlockIdObjectProperty(blockIdent: string, property: string): string {
    return `${blockIdent}_prop_${property}`
}
