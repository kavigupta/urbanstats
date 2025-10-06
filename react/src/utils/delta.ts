// See https://quilljs.com/docs/delta

export type Delta<T> = { insert: T[] } | { retain: number } | { delete: number }

export function apply<T>(seq: T[], deltas: Delta<T>[]): T[] {
    const result: T[] = []
    let i = 0
    for (const delta of deltas) {
        if ('insert' in delta) {
            result.push(...delta.insert)
        }
        if ('retain' in delta) {
            result.push(...result.slice(i, i + delta.retain))
            i += delta.retain
        }
        if ('delete' in delta) {
            i += delta.delete
        }
    }
    return result
}
