export type ArrayEdits<T> = (a: T[]) => T[]

export function replace<T>(edits: ArrayEdits<T>, [from, to]: [number, number], withArray: T[]): ArrayEdits<T> {
    return (a) => {
        const applied = edits(a)
        return [...applied.slice(0, from), ...withArray, ...applied.slice(to)]
    }
}
