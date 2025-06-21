import { emptyContext } from '../../unit/urban-stats-script-utils'
import validGeographies from '../data/mapper/used_geographies'
import { loadProtobuf } from '../load_json'
import { mapperContext } from '../mapper/context'
import { consolidatedStatsLink } from '../navigation/links'
import { ConsolidatedStatistics } from '../utils/protos'
import { NormalizeProto } from '../utils/types'

import { execute, InterpretationError } from './interpreter'
import { locationOf, locationOfLastExpression } from './parser'
import { renderType, USSRawValue, USSValue } from './types-values'
import { USSExecutionRequest, USSExecutionResult } from './workerManager'

// TODO: More caching

async function executeRequest(request: USSExecutionRequest): Promise<USSExecutionResult> {
    try {
        let result: USSValue
        switch (request.descriptor.kind) {
            case 'generic': {
                const context = emptyContext()
                result = execute(request.stmts, context)
                break
            }
            case 'mapper': {
                if (!validGeographies.includes(request.descriptor.geographyKind)) {
                    throw new Error('invalid geography')
                }
                const stats = (await loadProtobuf(
                    consolidatedStatsLink(request.descriptor.geographyKind),
                    'ConsolidatedStatistics',
                )) as NormalizeProto<ConsolidatedStatistics>
                const context = mapperContext(request.stmts, stats.stats, stats.longnames)
                result = execute(request.stmts, context)
                if (renderType(result.type) !== 'cMap') {
                    throw new InterpretationError(`USS expression did not return a cMap type, got: ${renderType(result.type)}`, locationOfLastExpression(request.stmts))
                }
                break
            }
        }
        return { success: true, value: { type: result.type, value: removeFunctions(result.value) } }
    }
    catch (error) {
        let interpretationError: InterpretationError
        if (error instanceof InterpretationError) {
            interpretationError = error
        }
        else {
            console.error('Unknown interpretation error', error)
            interpretationError = new InterpretationError('Unknown interpretation error', locationOf(request.stmts))
        }
        return { success: false, error: { message: interpretationError.message, shortMessage: interpretationError.shortMessage, location: interpretationError.location } }
    }
}

function removeFunctions(value: USSRawValue): USSRawValue {
    if (value instanceof Function) {
        return null
    }
    else if (Array.isArray(value)) {
        return value.map(removeFunctions)
    }
    else if (value instanceof Map) {
        return new Map(Array.from(value.entries()).map(([k, v]) => [k, removeFunctions(v)]))
    }
    else if (value instanceof Object && value.value instanceof Function) {
        return {
            type: value.type,
            value: {},
        }
    }
    return value
}

onmessage = async (message: MessageEvent<{ request: USSExecutionRequest, id: number }>) => {
    const result = await executeRequest(message.data.request)
    postMessage({ result, id: message.data.id })
}
