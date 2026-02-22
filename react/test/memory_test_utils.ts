import { cdpSessionWithSessionId } from './test_utils'

// Since testcafe accumulates memory in the CI, each memory test must be run in its own test file
export async function memoryUsage(t: TestController): Promise<number> {
    const cdpSession = await t.getCurrentCDPSession()
    await t.wait(5000) // Wait for page to load + stabilize

    let { targetInfos } = await cdpSession.Target.getTargets({})

    for (const target of targetInfos) {
        const { sessionId } = await cdpSession.Target.attachToTarget({ ...target, flatten: true })
        await cdpSessionWithSessionId(cdpSession, sessionId).HeapProfiler.collectGarbage()
    }

    // Wait for garbage collection
    await t.wait(1000);

    // Targets may be cleaned up as the result of garbage collection
    ({ targetInfos } = await cdpSession.Target.getTargets({}))

    let bytesUsed = 0
    const targetsWithMemory: (typeof targetInfos[number] & { bytes: number })[] = []

    for (const target of targetInfos) {
        const { sessionId } = await cdpSession.Target.attachToTarget({ ...target, flatten: true })

        const targetBytes = (await cdpSessionWithSessionId(cdpSession, sessionId).Runtime.getHeapUsage()).usedSize
        targetsWithMemory.push({ ...target, bytes: targetBytes })

        bytesUsed += targetBytes
    }

    console.warn(targetsWithMemory)
    return bytesUsed
}

export const homePageSize = 10_000_000
export const californiaArticleSize = 78_000_000
export const searchSize = 53_000_000
