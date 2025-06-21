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
    // The worker may return responses out of order, so we need to give them identifiers
    const messageQueue = new Map<number, (result: USSExecutionResult) => void>()
    worker.addEventListener('message', (message: MessageEvent<{ result: USSExecutionResult, id: number }>) => {
        messageQueue.get(message.data.id)!(message.data.result)
        messageQueue.delete(message.data.id)
    })
    let counter = 0
    const result: USSWorker = (request) => {
        const id = ++counter
        worker.postMessage({ request, id })
        return new Promise((resolve) => {
            messageQueue.set(id, resolve)
        })
    }
    return result
}

// TODO Terminate the worker if it hasn't been used in a while
