import { Context } from './context'
import { LocInfo } from './lexer'
import { getPrimitiveType, USSPrimitiveRawValue, USSRawValue, USSValue } from './types-values'

interface Operator {
    precedence: number
    unary?: (op: string, locInfo: LocInfo) => USSValue
    binary?: (op: string, locInfo: LocInfo) => USSValue
}

interface UnaryOperation {
    type: string
    fn: (x: USSPrimitiveRawValue) => USSPrimitiveRawValue
}

interface BinaryOperation {
    leftType: string
    rightType: string
    fn: (x: USSPrimitiveRawValue, y: USSPrimitiveRawValue) => USSPrimitiveRawValue
}

function unaryOperator(unos: UnaryOperation[]): (op: string, locInfo: LocInfo) => USSValue {
    return (op, locInfo) => {
        return {
            type: { type: 'function', posArgs: [{ type: 'anyPrimitive' }], namedArgs: {}, returnType: { type: 'inferFromPrimitive' } },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for type signature
            value: (ctx: Context, posArgs: USSRawValue[], _namedArgs: Record<string, USSRawValue>): USSRawValue => {
                const argType = getPrimitiveType(posArgs[0]).type
                for (const uno of unos) {
                    if (uno.type === argType) {
                        return uno.fn(posArgs[0] as USSPrimitiveRawValue)
                    }
                }
                throw ctx.error(`Invalid type for operator ${op}: ${argType}`, locInfo)
            },
        }
    }
}

function binaryOperator(bos: BinaryOperation[]): (op: string, locInfo: LocInfo) => USSValue {
    return (op, locInfo) => {
        return {
            type: { type: 'function', posArgs: [{ type: 'anyPrimitive' }, { type: 'anyPrimitive' }], namedArgs: {}, returnType: { type: 'inferFromPrimitive' } },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for type signature
            value: (ctx: Context, posArgs: USSRawValue[], _namedArgs: Record<string, USSRawValue>): USSRawValue => {
                const leftType = getPrimitiveType(posArgs[0]).type
                const rightType = getPrimitiveType(posArgs[1]).type
                for (const bo of bos) {
                    if (bo.leftType === leftType && bo.rightType === rightType) {
                        return bo.fn(posArgs[0] as USSPrimitiveRawValue, posArgs[1] as USSPrimitiveRawValue)
                    }
                }
                throw ctx.error(`Invalid types for operator ${op}: ${leftType} and ${rightType}`, locInfo)
            },
        }
    }
}

function numericBinaryOperation(fn: (a: number, b: number) => number): BinaryOperation {
    return {
        leftType: 'number',
        rightType: 'number',
        fn: (a, b) => fn(a as number, b as number),
    }
}

function comparisonOperation(
    fnNumber: (a: number, b: number) => boolean,
    fnString: (a: string, b: string) => boolean,
    fnBoolean: ((a: boolean, b: boolean) => boolean) | undefined = undefined,
    fnNull: ((a: null, b: null) => boolean) | undefined = undefined,
): BinaryOperation[] {
    const bos = [
        {
            leftType: 'number',
            rightType: 'number',
            fn: (a, b) => fnNumber(a as number, b as number),
        },
        {
            leftType: 'string',
            rightType: 'string',
            fn: (a, b) => fnString(a as string, b as string),
        },
    ] satisfies BinaryOperation[]
    if (fnBoolean !== undefined) {
        bos.push({
            leftType: 'boolean',
            rightType: 'boolean',
            fn: (a, b) => fnBoolean(a as boolean, b as boolean),
        })
    }
    if (fnNull !== undefined) {
        bos.push({
            leftType: 'null',
            rightType: 'null',
            fn: (a, b) => fnNull(a as null, b as null),
        })
    }
    return bos
}

function booleanOperation(fn: (a: boolean, b: boolean) => boolean): BinaryOperation {
    return {
        leftType: 'boolean',
        rightType: 'boolean',
        fn: (a, b) => fn(a as boolean, b as boolean),
    }
}

export const expressionOperatorMap = new Map<string, Operator>([
    // E
    ['**', { precedence: 1000, binary: binaryOperator([numericBinaryOperation((a, b) => Math.pow(a, b))]) }],
    // MD
    ['*', { precedence: 900, binary: binaryOperator([numericBinaryOperation((a, b) => a * b)]) }],
    ['/', { precedence: 900, binary: binaryOperator([numericBinaryOperation((a, b) => a / b)]) }],
    // AS
    ['+', {
        precedence: 800,
        unary: unaryOperator([{ type: 'number', fn: x => x }]),
        binary: binaryOperator([
            numericBinaryOperation((a, b) => a + b),
            { leftType: 'string', rightType: 'string', fn: (a, b) => (a as string) + (b as string) },
        ]),
    }],
    ['-', {
        precedence: 800,
        unary: unaryOperator([{ type: 'number', fn: x => -(x as number) }]),
        binary: binaryOperator([numericBinaryOperation((a, b) => a - b)]),
    }],
    // Comparators
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- for consistency
    ['==', { precedence: 700, binary: binaryOperator(comparisonOperation((a, b) => a === b, (a, b) => a === b, (a, b) => a === b, (a, b) => a === b)) }],
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- for consistency
    ['!=', { precedence: 700, binary: binaryOperator(comparisonOperation((a, b) => a !== b, (a, b) => a !== b, (a, b) => a !== b, (a, b) => a !== b)) }],
    ['<', { precedence: 700, binary: binaryOperator(comparisonOperation((a, b) => a < b, (a, b) => a < b)) }],
    ['>', { precedence: 700, binary: binaryOperator(comparisonOperation((a, b) => a > b, (a, b) => a > b)) }],
    ['<=', { precedence: 700, binary: binaryOperator(comparisonOperation((a, b) => a <= b, (a, b) => a <= b)) }],
    ['>=', { precedence: 700, binary: binaryOperator(comparisonOperation((a, b) => a >= b, (a, b) => a >= b)) }],
    // Logic
    ['!', { precedence: 650, unary: unaryOperator([{ type: 'boolean', fn: x => !(x as boolean) }]) }],
    ['&', { precedence: 600, binary: binaryOperator([booleanOperation((a, b) => a && b)]) }],
    ['|', { precedence: 500, binary: binaryOperator([booleanOperation((a, b) => a || b)]) }],
])

export const unaryOperators = [...expressionOperatorMap.entries()].filter(([, op]) => op.unary !== undefined).map(([op]) => op)
export const infixOperators = [...expressionOperatorMap.entries()].filter(([, op]) => op.binary !== undefined).map(([op]) => op)
