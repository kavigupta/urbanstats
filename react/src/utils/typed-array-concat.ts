interface TypedArrayLike extends ArrayLike<number> {
    set: (other: ArrayLike<number>, offset: number) => void
}

// https://2ality.com/2015/10/concatenating-typed-arrays.html
export function concatenate<T extends TypedArrayLike>(resultConstructor: new (size: number) => T, ...arrays: T[]): T {
    let totalLength = 0
    for (const arr of arrays) {
        totalLength += arr.length
    }
    const result = new resultConstructor(totalLength)
    let offset = 0
    for (const arr of arrays) {
        result.set(arr, offset)
        offset += arr.length
    }
    return result
}
