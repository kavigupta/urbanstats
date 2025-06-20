import type validGeographies from '../data/mapper/used_geographies'

import { InterpretationError } from './interpreter'
import { locationOf, UrbanStatsASTStatement } from './parser'
import { USSValue } from './types-values'

export type USSExecutionDescriptor = { kind: 'generic' } | { kind: 'mapper', geographyType: typeof validGeographies[number] }
interface USSExecutionRequest { descriptor: USSExecutionDescriptor, stmts: UrbanStatsASTStatement }
type USSExecutionResult = { success: true, value: USSValue } | { success: false, error: InterpretationError }

export function executeAsync(request: USSExecutionRequest): Promise<USSExecutionResult> {
    return Promise.resolve({ success: false, error: new InterpretationError('not implemented', locationOf(request.stmts)) })
}
