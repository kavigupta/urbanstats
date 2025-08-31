import { emptyContext } from '../../unit/urban-stats-script-utils'
import { Inset, Insets } from '../components/map'
import insets from '../data/insets'
import { Universe } from '../universe'
import { assert } from '../utils/defensive'

import { UrbanStatsASTExpression } from './ast'
import { insetNameToConstantName } from './constants/insets'
import { Context } from './context'
import { EditorError } from './editor-utils'
import { Effect, execute, InterpretationError } from './interpreter'
import { noLocation } from './location'
import { USSRawValue } from './types-values'
import { USSExecutionRequest, USSExecutionResult } from './workerManager'

async function executeRequest(request: USSExecutionRequest): Promise<USSExecutionResult> {
    let context, getWarnings
    try {
        ([context, getWarnings] = await contextForRequest(request))

        const result = execute(request.stmts, context)
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

function contextForRequest(request: USSExecutionRequest): Promise<[Context, () => EditorError[]]> {
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
            return Promise.resolve([emptyContext(effects), getWarnings])
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
