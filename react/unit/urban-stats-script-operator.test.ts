import assert from 'assert/strict'
import { test } from 'node:test'

import { allOperators } from '../src/urban-stats-script/lexer'

function allowedAmbiguity(checkOp: string, relevantOps: string[]): boolean {
    const comparisonOperators = new Set(['==', '!=', '<', '<=', '>', '>='])

    if (relevantOps.length <= 1 && relevantOps[0].length > checkOp.length) {
        return true
    }
    if (relevantOps.every(op => comparisonOperators.has(op) || op === '=') && comparisonOperators.has(checkOp)) {
        // comparison operators cannot be placed adjacently to each other
        // in valid USS, so it's fine if this is ambiguous.
        // same with = sign, which cannot be adjacent to comparison operators
        return true
    }
    if (relevantOps.length === 2 && relevantOps[0] === '!' && (relevantOps[1] === '=' || relevantOps[1] === '==')) {
        // != is allowed to be made of ! and = since ! cannot be used
        // except before an expression, so there is no ambiguity
        return true
    }
    if (relevantOps.length === 2 && relevantOps[0] === '*' && relevantOps[1] === '*') {
        // ** is allowed to be made of two * since * cannot be used
        // except between expressions, so there is no ambiguity
        return true
    }
    return false
}

void test('ensure operators are unambiguous', () => {
    const operators = allOperators()
    const conflicts = new Set<string>()
    for (const op1 of operators) {
        for (const op2 of operators) {
            for (const op3 of operators) {
                const combined = op1 + op2 + op3
                for (const checkOp of operators) {
                    if (checkOp === op1 || checkOp === op2 || checkOp === op3) {
                        continue
                    }
                    for (let idx = 0; idx <= combined.length - checkOp.length; idx++) {
                        const substr = combined.substring(idx, idx + checkOp.length)
                        if (substr !== checkOp) {
                            continue
                        }
                        let relevantIdxs = []
                        if (idx < op1.length) {
                            relevantIdxs.push(0)
                        }
                        else if (idx < op1.length + op2.length) {
                            relevantIdxs.push(1)
                        }
                        else {
                            relevantIdxs.push(2)
                        }
                        if (idx + checkOp.length > op1.length + op2.length) {
                            relevantIdxs.push(2)
                        }
                        else if (idx + checkOp.length > op1.length) {
                            relevantIdxs.push(1)
                        }
                        else {
                            relevantIdxs.push(0)
                        }
                        relevantIdxs = [...new Set(relevantIdxs)]
                        relevantIdxs.sort((a, b) => a - b)
                        const relevantOps = relevantIdxs.map(i => [op1, op2, op3][i])
                        if (allowedAmbiguity(checkOp, relevantOps)) {
                            continue
                        }
                        conflicts.add(JSON.stringify([checkOp, relevantOps]))
                    }
                }
            }
        }
    }
    if (conflicts.size > 0) {
        let message = 'Found operator ambiguities:\n'
        for (const conflict of conflicts) {
            const [conflictOp, relevantOps] = JSON.parse(conflict) as [string, string[]]
            message += `Operator "${conflictOp}" is ambiguous with operators: ${relevantOps.map(op => `"${op}"`).join(', ')}\n`
        }
        assert.fail(message)
    }
})
