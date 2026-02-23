import { Property } from './Property'
import { TestUtils } from './TestUtils'

export const waiting = Symbol('waiting')

export function notWaiting<T>(x: T | typeof waiting): x is T {
    return x !== waiting
}

// Turns an array of promies into a property that updates with their ordered results
export function promiseStream<T>(promises: Promise<T>[], label: string): Property<(T | typeof waiting)[]> {
    const values = Array.from<T | typeof waiting>({ length: promises.length }).fill(waiting)
    const result = new Property<(T | typeof waiting)[]>(Array.from(values))

    TestUtils.shared.startLoading(label)
    void Promise.allSettled(promises).finally(() => TestUtils.shared.finishLoading(label))

    for (const [i, promise] of promises.entries()) {
        void promise.then((value) => {
            values[i] = value
            result.value = Array.from(values)
        })
    }
    return result
}
