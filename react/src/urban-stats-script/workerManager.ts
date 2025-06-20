import validGeographies from '../data/mapper/used_geographies'

import { CMap } from './constants/map'
import { LocInfo } from './lexer'
import { UrbanStatsASTStatement } from './parser'
import { USSOpaqueType, USSValue } from './types-values'

export type USSExecutionDescriptor = { kind: 'generic' } | { kind: 'mapper', geographyKind: typeof validGeographies[number] }
export interface USSExecutionRequest { descriptor: USSExecutionDescriptor, stmts: UrbanStatsASTStatement }
interface AsyncInterpretationError { shortMessage: string, message: string, location: LocInfo }

export type USSExecutionResult<Value extends USSValue = USSValue> = { success: true, value: Value } | { success: false, error: AsyncInterpretationError }

export function executeAsync(request: { descriptor: { kind: 'mapper', geographyKind: typeof validGeographies[number] }, stmts: UrbanStatsASTStatement }): Promise<USSExecutionResult<{ type: USSOpaqueType, value: { type: 'opaque', value: CMap } }>>
export function executeAsync(request: USSExecutionRequest): Promise<USSExecutionResult>
export async function executeAsync(request: USSExecutionRequest): Promise<USSExecutionResult> {
    if (sharedUSSWorker === undefined) {
        sharedUSSWorker = createUSSWorker()
    }
    return await sharedUSSWorker(request)
}

type USSWorker = (params: USSExecutionRequest) => Promise<USSExecutionResult>

let sharedUSSWorker: USSWorker | undefined

function createUSSWorker(): USSWorker {
    const worker = new Worker(new URL('./worker', import.meta.url), { name: 'sharedUSSWorker' })
    const messageQueue: ((result: USSExecutionResult) => void)[] = []
    worker.addEventListener('message', (message: MessageEvent<USSExecutionResult>) => {
        messageQueue.shift()!(message.data)
    })
    const result: USSWorker = (params) => {
        worker.postMessage(params)
        return new Promise((resolve) => {
            messageQueue.push(resolve)
        })
    }
    return result
}
