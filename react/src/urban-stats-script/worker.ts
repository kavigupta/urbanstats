import { emptyContext } from '../../unit/urban-stats-script-utils'
import validGeographies from '../data/mapper/used_geographies'
import { loadProtobuf } from '../load_json'
import { mapperContext } from '../mapper/context'
import { consolidatedStatsLink } from '../navigation/links'
import { ConsolidatedStatistics } from '../utils/protos'
import { NormalizeProto } from '../utils/types'

import { execute, InterpretationError } from './interpreter'
import { locationOf, locationOfLastExpression } from './parser'
import { renderType } from './types-values'
import { USSExecutionRequest, USSExecutionResult } from './workerManager'

async function executeRequest(request: USSExecutionRequest): Promise<USSExecutionResult> {
    try {
        switch (request.descriptor.kind) {
            case 'generic': {
                const context = emptyContext()
                const result = execute(request.stmts, context)
                return { success: true, value: result }
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
                const result = execute(request.stmts, context)
                if (renderType(result.type) !== 'cMap') {
                    throw new InterpretationError(`USS expression did not return a cMap type, got: ${renderType(result.type)}`, locationOfLastExpression(request.stmts))
                }
                return { success: true, value: result }
            }
        }
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

onmessage = async (message: MessageEvent<USSExecutionRequest>) => {
    const result = await executeRequest(message.data)
    postMessage(result)
}
