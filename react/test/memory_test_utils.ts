// Since testcafe accumulates memory in the CI, each memory test must be run in its own test file

// This function is a factory becuase it's the only way I can figure out how to track other targets (Workers)
// Only call this once per test session
export async function memoryMonitor(t: TestController): Promise<() => Promise<number>> {
    const cdpSession = await t.getCurrentCDPSession()
    const { targetInfos: [defaultTarget] } = await cdpSession.Target.getTargets({}) // This is the page
    let targetInfos: { targetId: string }[] = []
    cdpSession.Target.on('attachedToTarget', ({ targetInfo }): void => { targetInfos.push(targetInfo) })
    cdpSession.Target.on('detachedFromTarget', (event): void => { targetInfos = targetInfos.filter(({ targetId }) => targetId !== event.targetId) })
    await cdpSession.Target.setAutoAttach({ autoAttach: true, waitForDebuggerOnStart: false })
    await cdpSession.Target.setDiscoverTargets({ discover: true })
    return async () => {
        await t.wait(1000) // Wait for page to load
        // We do main garabage collection in a separate step because it may cause other targets to be destroyed
        await cdpSession.HeapProfiler.collectGarbage()
        let bytesUsed = (await cdpSession.Runtime.getHeapUsage()).usedSize // For default target
        for (const target of targetInfos) {
            await cdpSession.Target.activateTarget(target)
            await cdpSession.HeapProfiler.collectGarbage()
            bytesUsed += (await cdpSession.Runtime.getHeapUsage()).usedSize
        }
        await cdpSession.Target.activateTarget(defaultTarget)
        console.warn(`Bytes used: ${bytesUsed}`)
        return bytesUsed
    }
}

export const homePageThreshold = 21_000_000
export const californiaArticleThreshold = 38_000_000
