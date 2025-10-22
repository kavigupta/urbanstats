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
