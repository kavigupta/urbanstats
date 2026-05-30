export function makeDestroyTracker(): {
    track: <T extends { length: number }>(arr: T) => T
    destroy: () => void
} {
    const tracked: { length: number }[] = []
    return {
        track<T extends { length: number }>(arr: T): T {
            tracked.push(arr)
            return arr
        },
        destroy() {
            for (const arr of tracked) arr.length = 0
            tracked.length = 0
        },
    }
}
