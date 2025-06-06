/* c8 ignore start */
export function assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
        throw new Error(message)
    }
}
/* c8 ignore end */
