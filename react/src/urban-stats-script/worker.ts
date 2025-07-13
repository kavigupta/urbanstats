import { emptyContext } from '../../unit/urban-stats-script-utils'
import validGeographies from '../data/mapper/used_geographies'
import statistic_variables_info from '../data/statistic_variables_info'
import { loadProtobuf } from '../load_json'
import { mapperContext, defaultTypeEnvironment } from '../mapper/context'
import { consolidatedStatsLink } from '../navigation/links'
import { assert } from '../utils/defensive'
import { ConsolidatedStatistics } from '../utils/protos'
import { NormalizeProto } from '../utils/types'

import { locationOf, locationOfLastExpression } from './ast'
import { execute, InterpretationError } from './interpreter'
import { renderType, USSRawValue, USSValue } from './types-values'
import { USSExecutionRequest, USSExecutionResult } from './workerManager'

let mapperCache: { stats: NormalizeProto<ConsolidatedStatistics>, geographyKind: typeof validGeographies[number] } | undefined

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
                let stats
                if (mapperCache?.geographyKind === request.descriptor.geographyKind) {
                    stats = mapperCache.stats
                }
                else {
                    stats = (await loadProtobuf(
                        consolidatedStatsLink(request.descriptor.geographyKind),
                        'ConsolidatedStatistics',
                    )) as NormalizeProto<ConsolidatedStatistics>
                    mapperCache = { stats, geographyKind: request.descriptor.geographyKind }
                }

                const annotateType = (name: string, val: USSRawValue): USSValue => {
                    const typeInfo = defaultTypeEnvironment.get(name)
                    assert(typeInfo !== undefined, `Type info for ${name} not found`)
                    return {
                        type: typeInfo.type,
                        documentation: typeInfo.documentation,
                        value: val,
                    }
                }

                const getVariable = (name: string): USSValue | undefined => {
                    if (name === 'geo') {
                        return annotateType('geo', stats.longnames)
                    }
                    const variableInfo = statistic_variables_info.variableNames.find(v => v.varName === name)
                    if (!variableInfo) {
                        return undefined
                    }
                    const index = variableInfo.index
                    return annotateType(name, stats.stats.map(stat => stat.stats[index]))
                }

                const context = mapperContext(request.stmts, getVariable)
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
        return { success: false, error: { type: 'error', value: interpretationError.value, location: interpretationError.location } }
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
