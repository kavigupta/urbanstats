import { emptyContext } from '../../unit/urban-stats-script-utils'
import { Inset, Insets } from '../components/map'
import insets from '../data/insets'
import validGeographies from '../data/mapper/used_geographies'
import statistic_path_list from '../data/statistic_path_list'
import statistic_variables_info from '../data/statistic_variables_info'
import { loadDataInIndexOrder, loadProtobuf } from '../load_json'
import { mapperContext, defaultTypeEnvironment } from '../mapper/context'
import { indexLink } from '../navigation/links'
import { Universe } from '../universe'
import { assert } from '../utils/defensive'

import { locationOfLastExpression, UrbanStatsASTExpression } from './ast'
import { insetNameToConstantName } from './constants/insets'
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
                // no idea why we need this, but it's obviously correct from the switch
                if (renderType(result.type) !== 'cMap' && renderType(result.type) !== 'cMapRGB' && renderType(result.type) !== 'pMap') {
                    throw new InterpretationError(`USS expression did not return a cMap, cMapRGB, or pMap type, got: ${renderType(result.type)}`, locationOfLastExpression(request.stmts))
                }
                break
            }
        }
        return { resultingValue: { type: result.type, value: removeFunctions(result.value) }, error: getWarnings() }
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
        return { error: [{ type: 'error', value: interpretationError.value, location: interpretationError.location, kind: 'error' }, ...(getWarnings?.() ?? [])] }
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
        if (name === 'geo') {
            return annotateType('geo', longnames.map(longname => ({ type: 'opaque', opaqueType: 'geoFeatureHandle', value: longname })))
        }
        if (name === 'geoCentroid') {
            return annotateType('geoCentroid', longnames.map(longname => ({ type: 'opaque', opaqueType: 'geoCentroidHandle', value: longname })))
        }
        if (name === 'defaultInsets') {
            return annotateType('defaultInsets', { type: 'opaque', opaqueType: 'insets', value: loadInset(request.descriptor.universe) })
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

        const variableData = await loadDataInIndexOrder(universe, statpath, geographyKind)
        assert(Array.isArray(variableData), `Expected variable data for ${name} to be an array`)
        mapperCache.dataCache.set(name, variableData)
        return annotateType(name, variableData)
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

export function loadInset(universe: Universe): Insets {
    const insetsU = insets[universe]
    assert(insetsU.length > 0, `No insets for universe ${universe}`)
    assert(insetsU[0].mainMap, `No main map for universe ${universe}`)
    const insetsProc = insetsU.map((inset) => {
        return {
            bottomLeft: [inset.bottomLeft[0], inset.bottomLeft[1]],
            topRight: [inset.topRight[0], inset.topRight[1]],
            // copy to get rid of readonly
            coordBox: [...inset.coordBox],
            mainMap: inset.mainMap,
        } satisfies Inset
    })
    return insetsProc
}

export function loadInsetExpression(universe: Universe): UrbanStatsASTExpression {
    const insetsU = insets[universe]
    const names = insetsU.map(x => x.name)

    const exprs = names.map((name) => {
        const expr = insetNameToConstantName.get(name)
        assert(expr !== undefined, `No inset constant for ${name}`)
        return { type: 'identifier', name: { node: expr, location: noLocation } } satisfies UrbanStatsASTExpression
    })

    return {
        type: 'call',
        fn: { type: 'identifier', name: { node: 'constructInsets', location: noLocation } },
        args: [{
            type: 'unnamed',
            value: {
                type: 'vectorLiteral',
                elements: exprs,
                entireLoc: noLocation,
            } satisfies UrbanStatsASTExpression,
        }],
        entireLoc: noLocation,
    } satisfies UrbanStatsASTExpression
}
