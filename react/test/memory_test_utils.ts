// Since testcafe accumulates memory in the CI, each memory test must be run in its own test file
export async function memoryUsage(t: TestController): Promise<number> {
    const cdpSession = await t.getCurrentCDPSession()
    await t.wait(5000) // Wait for page to load + stabilize

    let { targetInfos } = await cdpSession.Target.getTargets({})

    for (const target of targetInfos) {
        const { sessionId } = await cdpSession.Target.attachToTarget({ ...target, flatten: true })
        // @ts-expect-error -- sessionid
        await cdpSession.HeapProfiler.collectGarbage(sessionId)
    }

    // Wait for garbage collection
    await t.wait(1000);

    // Targets may be cleaned up as the result of garbage collection
    ({ targetInfos } = await cdpSession.Target.getTargets({}))

    let bytesUsed = 0
    const targetsWithMemory: (typeof targetInfos[number] & { bytes: number })[] = []

    for (const target of targetInfos) {
        const { sessionId } = await cdpSession.Target.attachToTarget({ ...target, flatten: true })

        // @ts-expect-error -- sessionid
        const targetBytes = (await cdpSession.Runtime.getHeapUsage(sessionId)).usedSize
        targetsWithMemory.push({ ...target, bytes: targetBytes })

        bytesUsed += targetBytes
    }

    console.warn(targetsWithMemory)
    return bytesUsed
}

export const homePageSize = 13_000_000
export const californiaArticleSize = 52_000_000
export const searchSize = 36_000_000
