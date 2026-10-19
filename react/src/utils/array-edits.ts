export type ArrayEdits<T> = (a: T[]) => T[]

export function swap<T>(array: T[], i: number, j: number): T[] {
    return array.map((x, k) => k === i ? array[j] : k === j ? array[i] : x)
}

export interface Edit<T> {
    modify: (v: Partial<T>) => void
    duplicate: () => void
    delete: () => void
    add: () => void
    moveUp: () => void
    moveDown: () => void
}
