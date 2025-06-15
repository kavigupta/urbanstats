import { Protocol } from 'devtools-protocol'

import { cdpSessionWithSessionId } from './test_utils'

export async function networkUsage(t: TestController): Promise<() => number> {
    const cdpSession = await t.getCurrentCDPSession()

    await t.wait(5000) // Wait for page to load + stabilize

    await cdpSession.Network.clearBrowserCache()

    let totalData = 0

    const ignoreRequestIds = new Set<Protocol.Network.RequestId>()

    async function handleTarget(target: Protocol.Target.TargetInfo): Promise<void> {
        const { sessionId } = await cdpSession.Target.attachToTarget({ ...target, flatten: true })

        const session = cdpSessionWithSessionId(cdpSession, sessionId)
        session.Network.on('loadingFinished', (event) => { if (!ignoreRequestIds.has(event.requestId)) totalData += event.encodedDataLength })

        session.Network.on('requestWillBeSent', (event) => {
            // exclude testcafe
            if (event.request.url.includes('localhost:1337')) {
                ignoreRequestIds.add(event.requestId)
            }
        })
    }

    const { targetInfos } = await cdpSession.Target.getTargets({})

    for (const target of targetInfos) {
        await handleTarget(target)
    }

    await cdpSession.Target.setDiscoverTargets({ discover: true })
    cdpSession.Target.on('targetCreated', (e) => {
        void handleTarget(e.targetInfo)
    })

    return () => {
        console.warn(`Network usage: ${totalData} bytes`)
        return totalData
    }
}
