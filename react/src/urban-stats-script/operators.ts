import { Context } from './context'
import { LocInfo } from './lexer'
import { getPrimitiveType, USSPrimitiveRawValue, USSRawValue, USSValue } from './types-values'

interface Operator {
    precedence: number
    unary?: (op: string, locInfo: LocInfo) => USSValue
    binary?: (op: string, locInfo: LocInfo) => USSValue
    description: string
    examples: string[]
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
            documentation: { humanReadableName: op },
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
            documentation: { humanReadableName: op },
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
    [
        '**',
        {
            precedence: 1000,
            binary: binaryOperator([numericBinaryOperation((a, b) => Math.pow(a, b))]),
            description: 'Exponentiation (power)',
            examples: ['2 ** 3 → 8', '3 ** 2 → 9'],
        },
    ],
    // MD
    [
        '*',
        {
            precedence: 900,
            binary: binaryOperator([numericBinaryOperation((a, b) => a * b)]),
            description: 'Multiplication',
            examples: ['3 * 4 → 12', '5 * 2 → 10'],
        },
    ],
    [
        '/',
        {
            precedence: 900,
            binary: binaryOperator([numericBinaryOperation((a, b) => a / b)]),
            description: 'Division',
            examples: ['10 / 2 → 5', '15 / 3 → 5'],
        },
    ],
    // AS
    [
        '+',
        {
            precedence: 800,
            unary: unaryOperator([{ type: 'number', fn: x => x }]),
            binary: binaryOperator([
                numericBinaryOperation((a, b) => a + b),
                { leftType: 'string', rightType: 'string', fn: (a, b) => (a as string) + (b as string) },
            ]),
            description: 'Unary plus, Addition, String concatenation',
            examples: ['+5', '2 + 3 → 5', '"hello" + "world" → "helloworld"'],
        },
    ],
    [
        '-',
        {
            precedence: 800,
            unary: unaryOperator([{ type: 'number', fn: x => -(x as number) }]),
            binary: binaryOperator([numericBinaryOperation((a, b) => a - b)]),
            description: 'Unary minus, Subtraction',
            examples: ['-5', '7 - 3 → 4'],
        },
    ],
    // Comparators
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- for consistency
    [
        '==',
        {
            precedence: 700,
            binary: binaryOperator(comparisonOperation((a, b) => a === b, (a, b) => a === b, (a, b) => a === b, (a, b) => a === b)),
            description: 'Equality (works with numbers, strings, booleans, null)',
            examples: ['5 == 5 → true', '"hello" == "hello" → true', 'true == true → true'],
        },
    ],
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- for consistency
    [
        '!=',
        {
            precedence: 700,
            binary: binaryOperator(comparisonOperation((a, b) => a !== b, (a, b) => a !== b, (a, b) => a !== b, (a, b) => a !== b)),
            description: 'Inequality (works with numbers, strings, booleans, null)',
            examples: ['5 != 3 → true', '"hello" != "world" → true'],
        },
    ],
    [
        '<',
        {
            precedence: 700,
            binary: binaryOperator(comparisonOperation((a, b) => a < b, (a, b) => a < b)),
            description: 'Less than (numbers and strings)',
            examples: ['3 < 5 → true', '"abc" < "def" → true'],
        },
    ],
    [
        '>',
        {
            precedence: 700,
            binary: binaryOperator(comparisonOperation((a, b) => a > b, (a, b) => a > b)),
            description: 'Greater than (numbers and strings)',
            examples: ['7 > 3 → true', '"xyz" > "abc" → true'],
        },
    ],
    [
        '<=',
        {
            precedence: 700,
            binary: binaryOperator(comparisonOperation((a, b) => a <= b, (a, b) => a <= b)),
            description: 'Less than or equal (numbers and strings)',
            examples: ['5 <= 5 → true', '3 <= 5 → true'],
        },
    ],
    [
        '>=',
        {
            precedence: 700,
            binary: binaryOperator(comparisonOperation((a, b) => a >= b, (a, b) => a >= b)),
            description: 'Greater than or equal (numbers and strings)',
            examples: ['5 >= 3 → true', '5 >= 5 → true'],
        },
    ],
    // Logic
    [
        '!',
        {
            precedence: 650,
            unary: unaryOperator([{ type: 'boolean', fn: x => !(x as boolean) }]),
            description: 'Logical NOT',
            examples: ['!true → false', '!false → true'],
        },
    ],
    [
        '&',
        {
            precedence: 600,
            binary: binaryOperator([booleanOperation((a, b) => a && b)]),
            description: 'Logical AND',
            examples: ['true & false → false', 'true & true → true'],
        },
    ],
    [
        '|',
        {
            precedence: 500,
            binary: binaryOperator([booleanOperation((a, b) => a || b)]),
            description: 'Logical OR',
            examples: ['true | false → true', 'false | false → false'],
        },
    ],
])

export const unaryOperators = [...expressionOperatorMap.entries()].filter(([, op]) => op.unary !== undefined).map(([op]) => op)
export const infixOperators = [...expressionOperatorMap.entries()].filter(([, op]) => op.binary !== undefined).map(([op]) => op)
