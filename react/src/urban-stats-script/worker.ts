import { emptyContext } from '../../unit/urban-stats-script-utils'
import validGeographies from '../data/mapper/used_geographies'
import statistic_path_list from '../data/statistic_path_list'
import statistic_variables_info from '../data/statistic_variables_info'
import { loadDataInIndexOrder, loadProtobuf } from '../load_json'
import { mapperContext, defaultTypeEnvironment } from '../mapper/context'
import { indexLink } from '../navigation/links'
import { assert } from '../utils/defensive'

import { locationOf, locationOfLastExpression } from './ast'
import { execute, InterpretationError } from './interpreter'
import { renderType, USSRawValue, USSValue } from './types-values'
import { USSExecutionRequest, USSExecutionResult } from './workerManager'

let mapperCache: {
    geographyKind: typeof validGeographies[number]
    longnames: string[]
    dataCache: Map<string, number[]>
} | undefined

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
                const geographyKind = request.descriptor.geographyKind
                if (!validGeographies.includes(geographyKind)) {
                    throw new Error('invalid geography')
                }

                // Load geography names and set up cache
                let longnames: string[]

                if (mapperCache?.geographyKind === geographyKind) {
                    longnames = mapperCache.longnames
                }
                else {
                    // Load geography names from index
                    const indexData = await loadProtobuf(indexLink('world', geographyKind), 'ArticleOrderingList')
                    longnames = indexData.longnames
                    mapperCache = {
                        geographyKind,
                        longnames,
                        dataCache: new Map(),
                    }
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

                const getVariable = async (name: string): Promise<USSValue | undefined> => {
                    assert(mapperCache !== undefined, 'mapperCache was initialized above and is never undefined after that')
                    if (name === 'geo') {
                        return annotateType('geo', longnames)
                    }
                    const variableInfo = statistic_variables_info.variableNames.find(v => v.varName === name)
                    if (!variableInfo) {
                        return undefined
                    }
                    const index = variableInfo.index

                    // Check cache first
                    const existing = mapperCache.dataCache.get(name)
                    if (existing !== undefined) {
                        return annotateType(name, existing)
                    }

                    const statpath = statistic_path_list[index]

                    const variableData = await loadDataInIndexOrder('world', statpath, geographyKind)
                    assert(Array.isArray(variableData), `Expected variable data for ${name} to be an array`)
                    mapperCache.dataCache.set(name, variableData)
                    return annotateType(name, variableData)
                }

                const context = await mapperContext(request.stmts, getVariable)
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
