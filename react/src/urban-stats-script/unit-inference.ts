import { unitTypeToStoredUnit } from '../utils/unit'

import { UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { TypeEnvironment } from './types-values'
import { AbstractInterpValue, constant, forward, forwardUnary, inUnit, join } from './unit-algebra'

const anything: AbstractInterpValue = { kind: 'any' }

/** What has been worked out so far: the statistics as the script found them, and the names it gave. */
interface Scope {
    typeEnvironment: TypeEnvironment
    named: Map<string, AbstractInterpValue>
}

/**
 * A block is worth as much as its last statement, and an empty one as much as nothing said. The
 * names it binds along the way are read by the statements after them.
 */
function block(statements: UrbanStatsASTStatement[], scope: Scope): AbstractInterpValue {
    let value = anything
    for (const statement of statements) {
        value = infer(statement, scope)
        if (statement.type === 'assignment' && statement.lhs.type === 'identifier') {
            scope.named.set(statement.lhs.name.node, value)
        }
    }
    return value
}

/** An arm of an `if` binds names for itself alone. */
function branch(statement: UrbanStatsASTStatement, scope: Scope): AbstractInterpValue {
    return infer(statement, { ...scope, named: new Map(scope.named) })
}

function identifier(name: string, scope: Scope): AbstractInterpValue {
    const named = scope.named.get(name)
    if (named !== undefined) {
        return named
    }
    const unit = scope.typeEnvironment.get(name)?.documentation?.unit
    return unit === undefined ? anything : inUnit(unitTypeToStoredUnit(unit))
}

function infer(ast: UrbanStatsASTExpression | UrbanStatsASTStatement, scope: Scope): AbstractInterpValue {
    switch (ast.type) {
        case 'assignment':
        case 'expression':
            return infer(ast.value, scope)
        case 'autoUXNode':
        case 'customNode':
            return infer(ast.expr, scope)
        case 'do':
            return block(ast.statements, scope)
        case 'statements':
            return block(ast.result, scope)
        // which regions are kept says nothing about what is measured of them
        case 'condition':
            return block(ast.rest, scope)
        case 'identifier':
            return identifier(ast.name.node, scope)
        case 'constant':
            return ast.value.node.type === 'number' ? constant(ast.value.node.value) : anything
        case 'unaryOperator':
            return forwardUnary(ast.operator.node, infer(ast.expr, scope))
        case 'binaryOperator':
            return forward(ast.operator.node, infer(ast.left, scope), infer(ast.right, scope))
        case 'vectorLiteral':
            return ast.elements.reduce<AbstractInterpValue>((soFar, element) => join(soFar, infer(element, scope)), { kind: 'none' })
        case 'if':
            return ast.else === undefined ? anything : join(branch(ast.then, scope), branch(ast.else, scope))
        case 'attribute':
        case 'call':
        case 'objectLiteral':
        case 'parseError':
            return anything
    }
}

/** What kind of quantity an expression works out to, as far as reading it can say. */
export function inferUnit(ast: UrbanStatsASTExpression | UrbanStatsASTStatement, typeEnvironment: TypeEnvironment): AbstractInterpValue {
    return infer(ast, { typeEnvironment, named: new Map() })
}
