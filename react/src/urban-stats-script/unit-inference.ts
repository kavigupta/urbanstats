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

/** A block is worth as much as its last statement, and an empty one as much as nothing said. */
function block(statements: UrbanStatsASTStatement[], scope: Scope): AbstractInterpValue {
    let value = anything
    for (const statement of statements) {
        value = infer(statement, scope)
    }
    return value
}

export type Bindings = Map<string, AbstractInterpValue>

function branch(statement: UrbanStatsASTStatement, scope: Scope): { value: AbstractInterpValue, named: Bindings } {
    const named = new Map(scope.named)
    return { value: infer(statement, { ...scope, named }), named }
}

/** A name an arm bound is worth what that arm made it where its mask held, and what it was where it did not. */
function bindArms(scope: Scope, consequent: Bindings, alternative: Bindings): void {
    for (const name of new Set([...consequent.keys(), ...alternative.keys()])) {
        scope.named.set(name, join(consequent.get(name) ?? { kind: 'none' }, alternative.get(name) ?? { kind: 'none' }))
    }
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
        case 'expression':
            return infer(ast.value, scope)
        case 'assignment': {
            const value = infer(ast.value, scope)
            if (ast.lhs.type === 'identifier') {
                scope.named.set(ast.lhs.name.node, value)
            }
            return value
        }
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
        case 'if': {
            const consequent = branch(ast.then, scope)
            // an arm that is not there leaves the value it would have written as it was
            const alternative = ast.else === undefined ? undefined : branch(ast.else, scope)
            bindArms(scope, consequent.named, alternative?.named ?? new Map(scope.named))
            return alternative === undefined ? consequent.value : join(consequent.value, alternative.value)
        }
        case 'attribute':
        case 'call':
        case 'objectLiteral':
        case 'parseError':
            return anything
    }
}

/** What kind of quantity an expression works out to, as far as reading it can say. */
export function inferUnit(ast: UrbanStatsASTExpression | UrbanStatsASTStatement, typeEnvironment: TypeEnvironment, named: Bindings = new Map()): AbstractInterpValue {
    return infer(ast, { typeEnvironment, named })
}

export function inferBindings(program: UrbanStatsASTStatement | UrbanStatsASTExpression, typeEnvironment: TypeEnvironment): Bindings {
    const named: Bindings = new Map()
    infer(program, { typeEnvironment, named })
    return named
}
