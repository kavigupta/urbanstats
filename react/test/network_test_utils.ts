import chalkTemplate from 'chalk-template'
import { Protocol } from 'devtools-protocol'

import { DefaultMap } from '../src/utils/DefaultMap'

import { cdpSessionWithSessionId } from './test_utils'

export async function networkUsage(t: TestController): Promise<(label: string) => Promise<number>> {
    const cdpSession = await t.getCurrentCDPSession()

    await t.wait(5000) // Wait for page to load + stabilize

    await cdpSession.Network.clearBrowserCache()

    const requests = new Map<Protocol.Network.RequestId, Protocol.Network.Request>()
    let requestBytes: { request: Protocol.Network.Request, bytes: number }[] = []

    // await cdpSession.Target.setDiscoverTargets({ discover: true })
    // await cdpSession.Target.setAutoAttach({ autoAttach: true, waitForDebuggerOnStart: false })

    cdpSession.Network.on('requestWillBeSent', (event) => {
        requests.set(event.requestId, event.request)
    })

    cdpSession.Network.on('loadingFinished', (event) => {
        const request = requests.get(event.requestId)
        requests.delete(event.requestId)
        if (request !== undefined && !request.url.includes('localhost:1337')) {
            // exclude testcafe
            requestBytes.push({ request, bytes: event.encodedDataLength })
        }
    })

    await cdpSession.Target.setDiscoverTargets({ discover: true })
    cdpSession.Target.on('targetCreated', async (e) => {
        const { sessionId } = await cdpSession.Target.attachToTarget({ ...e.targetInfo, flatten: true })

        const session = cdpSessionWithSessionId(cdpSession, sessionId)

        await session.Network.enable({})
    })

    return async (label: string) => {
        await t.wait(5000) // wait for page to finish

        const urlTree = new DefaultMap(() => ({ bytes: 0, folders: new DefaultMap(() => ({ bytes: 0, requests: [] as [string, number][] })) }))

        for (const { request, bytes } of requestBytes) {
            const match = /^(https?:\/\/[^\/]+)(\/[^\/]*)?(.*)$/.exec(request.url)
            if (match !== null) {
                const [, origin, folder, rest] = match
                urlTree.get(origin).bytes += bytes
                urlTree.get(origin).folders.get(folder).bytes += bytes
                urlTree.get(origin).folders.get(folder).requests.push([rest, bytes])
            }
        }

        const totalData = requestBytes.reduce((sum, { bytes }) => sum + bytes, 0)

        function formatBytes(bytes: number, chalkColor: string): string {
            return chalkTemplate`{${chalkColor} ${bytes.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '_').padStart(10)}}`
        }

        console.warn(`${formatBytes(totalData, 'magenta')} bytes network usage ${label}`)
        for (const [originKey, originValue] of urlTree.entries()) {
            console.warn(`${formatBytes(originValue.bytes, 'cyan')}    ${originKey}`)
            for (const [folderKey, folderValue] of originValue.folders) {
                console.warn(`${formatBytes(folderValue.bytes, 'blue')}        ${folderKey}`)
                if (folderValue.requests.length === 1 && folderValue.requests[0][0] === '') {
                    continue
                }
                for (const [requestKey, bytes] of folderValue.requests) {
                    console.warn(`${formatBytes(bytes, 'dim')}            ${requestKey}`)
                }
            }
        }

        requestBytes = []

        return totalData
    }
}
