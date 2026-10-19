export type ArrayEdits<T> = (a: T[]) => T[]

export function swap<T>(array: T[], i: number, j: number): T[] {
    return array.map((x, k) => k === i ? array[j] : k === j ? array[i] : x)
}

export interface EditSeq<T> {
    modify: (index: number, v: Partial<T>) => void
    edited: T[]
    add: () => void
    delete: (i: number) => void
    duplicate: (i: number) => void
    moveUp: (i: number) => void
    moveDown: (i: number) => void
}

export interface Edit<T> {
    modify: (v: Partial<T>) => void
    duplicate: () => void
    delete: () => void
    add: () => void
    moveUp: () => void
    moveDown: () => void
}

export function editIndex<T>(seq: EditSeq<T>, i: number): Edit<T> {
    return {
        modify: (v: Partial<T>) => { seq.modify(i, v) },
        delete: () => { seq.delete(i) },
        duplicate: () => { seq.duplicate(i) },
        add: seq.add,
        moveUp: () => { seq.moveUp(i) },
        moveDown: () => { seq.moveDown(i) },
    }
}
