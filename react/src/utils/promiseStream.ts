import { Property } from './Property'

export const waiting = Symbol('waiting')

export function notWaiting<T>(x: T | typeof waiting): x is T {
    return x !== waiting
}

// Turns an array of promies into a property that updates with their ordered results
export function promiseStream<T>(promises: Promise<T>[], { updateSpacing }: { updateSpacing: number }): Property<(T | typeof waiting)[]> {
    const values = Array.from<T | typeof waiting>({ length: promises.length }).fill(waiting)
    const result = new Property<(T | typeof waiting)[]>(Array.from(values))

    let lastUpdateTime: number | undefined
    let updateTimeout: ReturnType<typeof setTimeout> | undefined
    for (const [i, promise] of promises.entries()) {
        void promise.then((value) => {
            values[i] = value
            if (lastUpdateTime === undefined || Date.now() - lastUpdateTime >= updateSpacing) {
                result.value = Array.from(values)
                lastUpdateTime = Date.now()
            }
            else if (updateTimeout === undefined) {
                updateTimeout = setTimeout(() => {
                    result.value = Array.from(values)
                    lastUpdateTime = Date.now()
                    updateTimeout = undefined
                }, updateSpacing - (Date.now() - lastUpdateTime))
            }
        })
    }
    return result
}
