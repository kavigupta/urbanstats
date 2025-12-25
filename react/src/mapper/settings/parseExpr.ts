import { UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTLHS, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { extendBlockIdKwarg, extendBlockIdObjectProperty, extendBlockIdPositionalArg, extendBlockIdVectorElement, LocInfo } from '../../urban-stats-script/location'
import { Decorated, ParseError, parseNoErrorAsCustomNode, unparse } from '../../urban-stats-script/parser'
import { renderType, TypeEnvironment, USSObjectType, USSType } from '../../urban-stats-script/types-values'
import { assert } from '../../utils/defensive'

export function maybeParseExpr(
    expr: UrbanStatsASTExpression | UrbanStatsASTStatement,
    blockIdent: string,
    type: USSType,
    typeEnvironment: TypeEnvironment,
): UrbanStatsASTExpression | undefined {
    try {
        return parseExpr(expr, blockIdent, [type], typeEnvironment, () => {
            throw new Error('parsing failed')
        }, false)
    }
    catch {}
    return
}

type Fallback = (uss: string, i: string, t: USSType[]) => UrbanStatsASTExpression

export function parseExpr(
    expr: UrbanStatsASTExpression | UrbanStatsASTStatement,
    blockIdent: string,
    types: USSType[],
    typeEnvironment: TypeEnvironment,
    fallback: Fallback,
    preserveCustomNodes: boolean,
): UrbanStatsASTExpression {
    const parsed = attemptParseExpr(expr, blockIdent, types, typeEnvironment, fallback, preserveCustomNodes)
    // just to confirm everything is fine
    if (parsed !== undefined) changeBlockId(parsed, blockIdent, '')
    return parsed ?? fallback(unparse(expr), blockIdent, types)
}

function attemptParseExpr(
    expr: UrbanStatsASTExpression | UrbanStatsASTStatement,
    blockIdent: string,
    types: USSType[],
    typeEnvironment: TypeEnvironment,
    fallback: Fallback,
    preserveCustomNodes: boolean,
): UrbanStatsASTExpression | undefined {
    switch (expr.type) {
        case 'condition':
        case 'binaryOperator':
        case 'if':
        case 'assignment':
        case 'parseError':
        case 'attribute':
            return undefined
        case 'vectorLiteral':
            const elementTypes = types
                .filter(t => t.type === 'vector')
                .map(t => t.elementType)
                .filter(t => t.type !== 'elementOfEmptyVector') satisfies USSType[]
            if (elementTypes.length === 0) {
                return undefined
            }
            return {
                type: 'vectorLiteral',
                entireLoc: emptyLocation(blockIdent),
                elements: expr.elements.map((elem, idx) => parseExpr(elem, extendBlockIdVectorElement(blockIdent, idx), elementTypes, typeEnvironment, parseNoErrorAsCustomNode, preserveCustomNodes)),
            }
        case 'objectLiteral':
            const exprProps = new Set(expr.properties.map(([key]) => key))
            const compatibleTypes = types.filter(
                (t) => {
                    if (t.type !== 'object') {
                        return false
                    }
                    if (t.properties.size !== expr.properties.length) {
                        return false
                    }
                    if (Array.from(t.properties.keys()).some(key => !exprProps.has(key))) {
                        return false
                    }
                    return true
                },
            ) as USSObjectType[]
            if (compatibleTypes.length === 0) {
                return undefined
            }
            return {
                type: 'objectLiteral',
                entireLoc: emptyLocation(blockIdent),
                properties: expr.properties.map(([key, value]) => [
                    key,
                    parseExpr(value, extendBlockIdObjectProperty(blockIdent, key), compatibleTypes.map(t => t.properties.get(key)!) satisfies USSType[], typeEnvironment, parseNoErrorAsCustomNode, preserveCustomNodes),
                ]),
            }
        case 'do':
            const stmts = { type: 'statements', result: expr.statements, entireLoc: expr.entireLoc } satisfies UrbanStatsASTStatement
            return attemptParseExpr(stmts, blockIdent, types, typeEnvironment, fallback, preserveCustomNodes) ?? fallback(unparse(stmts), blockIdent, types)
        case 'customNode':
            if (preserveCustomNodes) {
                return parseNoErrorAsCustomNode(unparse(expr, { simplify: true }), blockIdent, types)
            }
            else {
                return parseExpr(expr.expr, blockIdent, types, typeEnvironment, fallback, preserveCustomNodes)
            }
        case 'statements':
            if (expr.result.length === 1) {
                return parseExpr(expr.result[0], blockIdent, types, typeEnvironment, fallback, preserveCustomNodes)
            }
            return undefined
        case 'expression':
            return parseExpr(expr.value, blockIdent, types, typeEnvironment, fallback, preserveCustomNodes)
        case 'identifier':
            const validVariableSelections = possibilities(types, typeEnvironment).filter(s => s.type === 'variable') as { type: 'variable', name: string }[]
            if (validVariableSelections.some(s => s.name === expr.name.node)) {
                return { type: 'identifier', name: { node: expr.name.node, location: emptyLocation(blockIdent) } }
            }
            return undefined
        case 'constant':
            if (types.some(type => type.type === expr.value.node.type)) {
                return { type: 'constant', value: { node: expr.value.node, location: emptyLocation(blockIdent) } }
            }
            return undefined
        case 'unaryOperator':
            if (expr.operator.node === '-' && expr.expr.type === 'constant' && expr.expr.value.node.type === 'number' && types.some(type => type.type === 'number')) {
                return {
                    type: 'constant',
                    value: { location: emptyLocation(blockIdent), node: { type: 'number', value: -(expr.expr.value.node.value) } },
                }
            }
            return undefined
        case 'call':
            const fn = expr.fn
            if (fn.type !== 'identifier') {
                return undefined
            }
            const validFunctionSelections = possibilities(types, typeEnvironment).filter(s => s.type === 'function') as { type: 'function', name: string }[]
            if (!validFunctionSelections.some(s => s.name === fn.name.node)) {
                return undefined
            }
            const tdoc = typeEnvironment.get(fn.name.node)
            if (!tdoc || tdoc.type.type !== 'function') {
                return undefined
            }
            const fnType = tdoc.type
            let positionals = expr.args.filter(a => a.type === 'unnamed') satisfies (UrbanStatsASTArg & { type: 'unnamed' })[]
            if (positionals.length !== fnType.posArgs.length) {
                return undefined
            }
            let nameds = expr.args.filter(a => a.type === 'named') satisfies (UrbanStatsASTArg & { type: 'named' })[]
            const names = new Set(nameds.map(a => a.name.node))
            const needed = Object.entries(fnType.namedArgs).filter(([, a]) => a.defaultValue === undefined)
            if (needed.some(([name]) => !names.has(name))) {
                return undefined
            }
            if (fnType.posArgs.some(a => a.type !== 'concrete')) {
                return undefined
            }
            positionals = positionals.map((a, i) => ({
                type: 'unnamed',
                value: parseExpr(a.value, extendBlockIdPositionalArg(blockIdent, i), [(fnType.posArgs[i] as { type: 'concrete', value: USSType }).value], typeEnvironment, parseNoErrorAsCustomNode, preserveCustomNodes),
            }))
            if (Object.values(fnType.namedArgs).some(a => a.type.type !== 'concrete')) {
                return undefined
            }
            nameds = nameds.map(a => ({
                type: 'named',
                name: { node: a.name.node, location: emptyLocation(blockIdent) },
                value: parseExpr(a.value, extendBlockIdKwarg(blockIdent, a.name.node), [(fnType.namedArgs[a.name.node].type as { type: 'concrete', value: USSType }).value], typeEnvironment, parseNoErrorAsCustomNode, preserveCustomNodes),
            }))
            return {
                type: 'call',
                fn: { type: 'identifier', name: { node: fn.name.node, location: emptyLocation(blockIdent) } },
                args: [...positionals, ...nameds],
                entireLoc: emptyLocation(blockIdent),
            }
    }
}

export type Selection = { type: 'variable' | 'function', name: string } | { type: 'custom' } | { type: 'constant' } | { type: 'vector' } | { type: 'object' }

function shouldShowConstant(type: USSType): boolean {
    return type.type === 'number' || type.type === 'string'
}

export function possibilities(target: USSType[], env: TypeEnvironment): Selection[] {
    const results: Selection[] = []
    // Add vector option if the type is a vector
    if (target.some(t => t.type === 'vector')) {
        results.push({ type: 'vector' })
    }
    // Add properties option if the type is an object
    if (target.some(t => t.type === 'object')) {
        results.push({ type: 'object' })
    }
    // Add custom option for non-opaque or custom-allowed types
    if (target.some(t => t.type !== 'opaque' || t.allowCustomExpression !== false)) {
        results.push({ type: 'custom' })
    }
    // Add constant option for numbers and strings
    if (target.some(shouldShowConstant)) {
        results.push({ type: 'constant' })
    }
    else {
        const renderedTypes = target.map(renderType)
        // Only add variables and functions if constants are not shown
        const variables: Selection[] = []
        const functions: Selection[] = []
        for (const [name, type] of env) {
            const t: USSType = type.type
            // if (renderType(t) === renderType(target)) {
            if (renderedTypes.includes(renderType(t))) {
                variables.push({ type: 'variable', name })
            }
            else if (t.type === 'function' && t.returnType.type === 'concrete' && renderedTypes.includes(renderType(t.returnType.value))) {
                functions.push({ type: 'function', name })
            }
        }
        // Sort variables by priority (lower numbers first)
        variables.sort((a, b) => {
            const aPriority = a.type === 'variable' ? (env.get(a.name)?.documentation?.priority ?? 1) : 1
            const bPriority = b.type === 'variable' ? (env.get(b.name)?.documentation?.priority ?? 1) : 1
            return aPriority - bPriority
        })
        // Sort functions by priority (functions get priority 0 by default)
        functions.sort((a, b) => {
            const aPriority = a.type === 'function' ? (env.get(a.name)?.documentation?.priority ?? 0) : 0
            const bPriority = b.type === 'function' ? (env.get(b.name)?.documentation?.priority ?? 0) : 0
            return aPriority - bPriority
        })
        // Functions first, then variables
        results.push(...functions)
        results.push(...variables)
    }
    return results
} export function changeBlockId(expr: UrbanStatsASTExpression, a: string, b: string): UrbanStatsASTExpression {
    function recD<T>(e: Decorated<T>): Decorated<T> {
        return {
            node: e.node,
            location: recL(e.location),
        }
    }

    function recL(l: LocInfo): LocInfo {
        switch (l.start.block.type) {
            case 'single':
                assert(l.end.block.type === 'single', 'Mismatched block types in LocInfo in changeBlockId')
                assert(l.start.block.ident === l.end.block.ident, 'Mismatched block idents in LocInfo in changeBlockId')
                if (!l.start.block.ident.startsWith(a)) {
                    console.error(`[failtest] Block ident mismatch in changeBlockId: expected to start with ${JSON.stringify(a)}, got ${JSON.stringify(l.start.block.ident)}`)
                    return l
                }
                const newBlockIdentStart = b + l.start.block.ident.slice(a.length)
                return {
                    start: {
                        ...l.start,
                        block: {
                            type: 'single',
                            ident: newBlockIdentStart,
                        },
                    },
                    end: {
                        ...l.end,
                        block: {
                            type: 'single',
                            ident: newBlockIdentStart,
                        },
                    },
                }
            case 'multi':
                assert(l.end.block.type === 'multi', 'Mismatched block types in LocInfo in changeBlockId')
                return l // do nothing
        }
    }

    function recErr(err: ParseError): ParseError {
        return {
            ...err,
            location: recL(err.location),
        }
    }

    function recS(s: UrbanStatsASTStatement): UrbanStatsASTStatement {
        switch (s.type) {
            case 'expression':
                return {
                    type: 'expression',
                    value: recE(s.value),
                }
            case 'assignment':
                return {
                    type: 'assignment',
                    lhs: recE(s.lhs) as UrbanStatsASTLHS,
                    value: recE(s.value),
                }
            case 'statements':
                return {
                    type: 'statements',
                    entireLoc: recL(s.entireLoc),
                    result: s.result.map(recS),
                }
            case 'parseError':
                return {
                    type: 'parseError',
                    originalCode: s.originalCode,
                    errors: s.errors.map(recErr),
                }
            case 'condition':
                return {
                    type: 'condition',
                    condition: recE(s.condition),
                    entireLoc: recL(s.entireLoc),
                    rest: s.rest.map(recS),
                }
        }
    }

    function recE(e: UrbanStatsASTExpression): UrbanStatsASTExpression {
        switch (e.type) {
            case 'identifier':
                return { type: 'identifier', name: recD(e.name) }
            case 'constant':
                return { type: 'constant', value: recD(e.value) }
            case 'call':
                return {
                    type: 'call',
                    fn: recE(e.fn),
                    args: e.args.map((arg) => {
                        if (arg.type === 'named') {
                            return {
                                type: 'named' as const,
                                name: recD(arg.name),
                                value: recE(arg.value),
                            }
                        }
                        else {
                            return {
                                type: 'unnamed' as const,
                                value: recE(arg.value),
                            }
                        }
                    }),
                    entireLoc: recL(e.entireLoc),
                }
            case 'vectorLiteral':
                return {
                    type: 'vectorLiteral',
                    entireLoc: recL(e.entireLoc),
                    elements: e.elements.map(recE),
                }
            case 'objectLiteral':
                return {
                    type: 'objectLiteral',
                    entireLoc: recL(e.entireLoc),
                    properties: e.properties.map(([k, v]) => [k, recE(v)]),
                }
            case 'customNode':
                return {
                    type: 'customNode',
                    expr: recS(e.expr),
                    entireLoc: recL(e.entireLoc),
                    originalCode: e.originalCode,
                }
            case 'attribute':
                return {
                    type: 'attribute',
                    expr: recE(e.expr),
                    name: recD(e.name),
                }
            case 'binaryOperator':
                return {
                    type: 'binaryOperator',
                    operator: recD(e.operator),
                    left: recE(e.left),
                    right: recE(e.right),
                }
            case 'unaryOperator':
                return {
                    type: 'unaryOperator',
                    operator: recD(e.operator),
                    expr: recE(e.expr),
                }
            case 'if':
                return {
                    type: 'if',
                    condition: recE(e.condition),
                    then: recS(e.then),
                    else: e.else ? recS(e.else) : undefined,
                    entireLoc: recL(e.entireLoc),
                }
            case 'do':
                return {
                    type: 'do',
                    statements: e.statements.map(recS),
                    entireLoc: recL(e.entireLoc),
                }
        }
    }

    return recE(expr)
}
