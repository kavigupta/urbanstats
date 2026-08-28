// Sign in sometimes hangs in CI with an empty page; these lines say which request never came back.
export async function traced<T>(what: string, work: () => Promise<T>): Promise<T> {
    const start = Date.now()
    console.warn(`${what}: started`)
    try {
        const result = await work()
        console.warn(`${what}: finished after ${Date.now() - start} ms`)
        return result
    }
    catch (error) {
        console.warn(`${what}: threw after ${Date.now() - start} ms: ${error instanceof Error ? error.message : String(error)}`)
        throw error
    }
}
