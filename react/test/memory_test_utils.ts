// Since testcafe accumulates memory in the CI, each memory test must be run in its own test file
export async function getJSHeapSize(t: TestController): Promise<number> {
    await t.wait(1000) // Wait for page to load
    const cdpSession = await t.getCurrentCDPSession()
    await cdpSession.HeapProfiler.collectGarbage()
    await t.wait(1000) // Wait for garbage collect
    const bytesUsed = await t.eval(() => (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize) as number
    console.warn(`Bytes used: ${bytesUsed}`)
    return bytesUsed
}

export const homePageThreshold = 35_000_000
export const compressedSearchIndexSize = 3_000_000
export const californiaArticleThreshold = 57_000_000
