import { emptyContext } from '../../unit/urban-stats-script-utils'
import validGeographies from '../data/mapper/used_geographies'
import statistic_path_list from '../data/statistic_path_list'
import statistic_variables_info from '../data/statistic_variables_info'
import { loadOrderingDataProtobuf, loadProtobuf } from '../load_json'
import { mapperContext, defaultTypeEnvironment, loadInsets } from '../mapper/context'
import { indexLink } from '../navigation/links'
import { Universe } from '../universe'
import { assert } from '../utils/defensive'

import { locationOfLastExpression } from './ast'
import { Context } from './context'
import { EditorError } from './editor-utils'
import { Effect, execute, InterpretationError } from './interpreter'
import { noLocation } from './location'
import { renderType, USSRawValue, USSValue } from './types-values'
import { USSExecutionRequest, USSExecutionResult } from './workerManager'

let mapperCache: {
    universe: Universe
    geographyKind: typeof validGeographies[number]
    longnames: string[]
    dataCache: Map<string, number[]>
} | undefined

async function executeRequest(request: USSExecutionRequest): Promise<USSExecutionResult> {
    let context, getWarnings
    try {
        ([context, getWarnings] = await contextForRequest(request))
        const result = execute(request.stmts, context)

        switch (request.descriptor.kind) {
            case 'generic': {
                break
            }
            case 'mapper': {
                if (renderType(result.type) !== 'cMap' && renderType(result.type) !== 'cMapRGB' && renderType(result.type) !== 'pMap') {
                    throw new InterpretationError(`USS expression did not return a cMap, cMapRGB, or pMap type, got: ${renderType(result.type)}`, locationOfLastExpression(request.stmts))
                }
                break
            }
            case 'statistics': {
                if (renderType(result.type) !== 'table') {
                    throw new InterpretationError(`USS expression did not return a table type, got: ${renderType(result.type)}`, locationOfLastExpression(request.stmts))
                }
                break
            }
        }
        return {
            resultingValue: { type: result.type, value: removeFunctions(result.value) },
            error: getWarnings(),
            context: new Map([...context.variableEntries()].filter(([,v]) => v.documentation?.includedInOutputContext)),
        }
    }
    catch (error) {
        let interpretationError: InterpretationError
        if (error instanceof InterpretationError) {
            interpretationError = error
        }
        else {
            console.error('Unknown interpretation error', error)
            interpretationError = new InterpretationError('Unknown interpretation error', noLocation)
        }
        return {
            error: [{ type: 'error', value: interpretationError.value, location: interpretationError.location, kind: 'error' }, ...(getWarnings?.() ?? [])],
            context: new Map(),
        }
    }
}

async function contextForRequest(request: USSExecutionRequest): Promise<[Context, () => EditorError[]]> {
    const effects: Effect[] = []
    const getWarnings = (): EditorError[] => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- just so if there's additonal types, we're safe
        return effects.filter(eff => eff.type === 'warning').map(eff => ({
            type: 'error',
            value: eff.message,
            location: eff.location,
            kind: 'warning',
        }))
    }
    switch (request.descriptor.kind) {
        case 'generic':
            return [emptyContext(effects), getWarnings]
        case 'mapper':
        case 'statistics':
            return [await mapperContextForRequest(request as USSExecutionRequest & { descriptor: { kind: 'mapper' } }, effects), getWarnings]
    }
}

async function mapperContextForRequest(request: USSExecutionRequest & { descriptor: { kind: 'mapper' } }, effects: Effect[]): Promise<Context> {
    const geographyKind = request.descriptor.geographyKind
    const universe = request.descriptor.universe
    const dte = defaultTypeEnvironment(universe)
    if (!validGeographies.includes(geographyKind)) {
        throw new Error('invalid geography')
    }

    // Load geography names and set up cache
    let longnames: string[]

    if (mapperCache?.geographyKind === geographyKind && mapperCache.universe === universe) {
        longnames = mapperCache.longnames
    }
    else {
        // Load geography names from index
        const indexData = await loadProtobuf(indexLink(universe, geographyKind), 'ArticleOrderingList')
        longnames = indexData.longnames
        mapperCache = {
            universe,
            geographyKind,
            longnames,
            dataCache: new Map(),
        }
    }

    const annotateType = (name: string, val: USSRawValue): USSValue => {
        const typeInfo = dte.get(name)
        assert(typeInfo !== undefined, `Type info for ${name} not found`)
        return {
            type: typeInfo.type,
            documentation: typeInfo.documentation,
            value: val,
        }
    }

    const getVariable = async (name: string): Promise<USSValue | undefined> => {
        assert(mapperCache !== undefined, 'mapperCache was initialized above and is never undefined after that')
        if (name === 'geoName') {
            return annotateType('geoName', longnames)
        }
        if (name === 'geo') {
            return annotateType('geo', longnames.map(longname => ({ type: 'opaque', opaqueType: 'geoFeatureHandle', value: longname })))
        }
        if (name === 'geoCentroid') {
            return annotateType('geoCentroid', longnames.map(longname => ({ type: 'opaque', opaqueType: 'geoCentroidHandle', value: longname })))
        }
        if (name === 'defaultInsets') {
            return annotateType('defaultInsets', { type: 'opaque', opaqueType: 'insets', value: loadInsets(request.descriptor.universe) })
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

        const variableData = await loadOrderingDataProtobuf(universe, statpath, geographyKind)
        assert(Array.isArray(variableData.value), `Expected variable data for ${name} to be an array`)
        mapperCache.dataCache.set(name, variableData.value)
        return annotateType(name, variableData.value)
    }

    const context = await mapperContext(request.stmts, getVariable, effects, universe)
    return context
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
        assert(value.opaqueType === 'scale', 'only scales can have functions in their value')
        return null
    }
    return value
}

onmessage = async (message: MessageEvent<{ request: USSExecutionRequest, id: number }>) => {
    if (!('request' in message.data)) {
        // Some other message (e.g. from React devtools)
        return
    }
    const result = await executeRequest(message.data.request)
    postMessage({ result, id: message.data.id })
}
