import { BaseLocInfo, SingleLocation } from './lexer'

export function stringIndexToLocation(lines: string[], colIdx: number): SingleLocation {
    let lineIdx = 0
    while (lineIdx < lines.length - 1 && lines[lineIdx].length < colIdx) {
        colIdx -= lines[lineIdx].length + 1
        lineIdx++
    }
    return {
        lineIdx,
        colIdx,
    }
}

function compareLocations(a: SingleLocation, b: SingleLocation): number {
    if (a.lineIdx !== b.lineIdx) {
        return a.lineIdx - b.lineIdx
    }
    return a.colIdx - b.colIdx
}

export function containsLocation(range: BaseLocInfo, location: SingleLocation): boolean {
    return compareLocations(range.start, location) <= 0 && compareLocations(location, range.end) < 0
}
