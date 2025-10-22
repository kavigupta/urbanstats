export async function retry<T>(retries: number, fn: () => Promise<T>): Promise<T> {
    while (true) {
        try {
            return await fn()
        }
        catch (error) {
            retries--
            if (retries > 0) {
                console.warn('Retrying...', error)
            }
            else {
                throw error
            }
        }
    }
}
