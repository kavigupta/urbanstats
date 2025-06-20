import { emptyContext } from '../../unit/urban-stats-script-utils'
import validGeographies from '../data/mapper/used_geographies'
import { loadProtobuf } from '../load_json'
import { mapperContext } from '../mapper/context'
import { consolidatedStatsLink } from '../navigation/links'
import { ConsolidatedStatistics } from '../utils/protos'
import { NormalizeProto } from '../utils/types'

import { CMap } from './constants/map'
import { execute, InterpretationError } from './interpreter'
import { locationOf, locationOfLastExpression, UrbanStatsASTStatement } from './parser'
import { renderType, USSOpaqueType, USSValue } from './types-values'

export type USSExecutionDescriptor = { kind: 'generic' } | { kind: 'mapper', geographyKind: typeof validGeographies[number] }
interface USSExecutionRequest { descriptor: USSExecutionDescriptor, stmts: UrbanStatsASTStatement }
type USSExecutionResult<Value extends USSValue> = { success: true, value: Value } | { success: false, error: InterpretationError }

export function executeAsync(request: { descriptor: { kind: 'mapper', geographyKind: typeof validGeographies[number] }, stmts: UrbanStatsASTStatement }): Promise<USSExecutionResult<{ type: USSOpaqueType, value: { type: 'opaque', value: CMap } }>>
export function executeAsync(request: USSExecutionRequest): Promise<USSExecutionResult<USSValue>>
export async function executeAsync(request: USSExecutionRequest): Promise<USSExecutionResult<USSValue>> {
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
        if (error instanceof InterpretationError) {
            return { success: false, error }
        }
        else {
            console.error('Unknown execution error', error)
            return { success: false, error: new InterpretationError('Unknown execution error', locationOf(request.stmts)) }
        }
    }
}
