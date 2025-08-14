import { UrbanStatsASTStatement } from './ast'
import { EditorError } from './editor-utils'
import { USSValue } from './types-values'

export interface USSExecutionDescriptor { kind: 'generic' }
export interface USSExecutionRequest { descriptor: USSExecutionDescriptor, stmts: UrbanStatsASTStatement }
export type AsyncInterpretationError = EditorError[]

export interface USSExecutionResult<Value extends USSValue = USSValue> { resultingValue?: Value, error: AsyncInterpretationError }

export function executeAsync(request: USSExecutionRequest): Promise<USSExecutionResult>
export async function executeAsync(request: USSExecutionRequest): Promise<USSExecutionResult> {
    if (sharedUSSWorker === undefined) {
        sharedUSSWorker = createUSSWorker()
    }
    return await sharedUSSWorker(request)
}

type USSWorker = (params: USSExecutionRequest) => Promise<USSExecutionResult>

let sharedUSSWorker: USSWorker | undefined

const terminationDelay = 10_000

function createUSSWorker(): USSWorker {
    const worker = new Worker(new URL('./worker', import.meta.url), { name: 'sharedUSSWorker' })
    // The worker may return responses out of order, so we need to give them identifiers
    const messageQueue = new Map<number, (result: USSExecutionResult) => void>()
    worker.addEventListener('message', (message: MessageEvent<{ result: USSExecutionResult, id: number }>) => {
        messageQueue.get(message.data.id)!(message.data.result)
        messageQueue.delete(message.data.id)
    })

    // worker should terminate if not used
    let terminationTimer: ReturnType<typeof setTimeout> | undefined
    function resetTerminationTimer(): void {
        clearTimeout(terminationTimer)
        terminationTimer = setTimeout(() => {
            if (messageQueue.size > 0) {
                resetTerminationTimer()
            }
            else {
                worker.terminate()
                sharedUSSWorker = undefined
            }
        }, terminationDelay)
    }
    resetTerminationTimer()

    let counter = 0
    const result: USSWorker = (request) => {
        resetTerminationTimer()
        const id = ++counter
        worker.postMessage({ request, id })
        return new Promise((resolve) => {
            messageQueue.set(id, resolve)
        })
    }

    return result
}
