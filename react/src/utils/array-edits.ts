export type ArrayEdits<T> = (a: T[]) => T[]

export function replace<T>(edits: ArrayEdits<T>, [from, to]: [number, number], withArray: T[]): ArrayEdits<T> {
    return (a) => {
        const applied = edits(a)
        return [...applied.slice(0, from), ...withArray, ...applied.slice(to)]
    }
}

export function swap<T>(edits: ArrayEdits<T>, indexA: number, indexB: number): ArrayEdits<T> {
    return (a) => {
        const array = edits(a)
        const itemA = array[indexA]
        const itemB = array[indexB]
        const result = Array.from(array)
        result[indexB] = itemA
        result[indexA] = itemB
        return result
    }
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
