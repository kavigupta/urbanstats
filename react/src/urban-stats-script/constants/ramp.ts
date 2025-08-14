import { getRamps } from '../../mapper/ramps'
import { Context } from '../context'
import { parseNoErrorAsExpression } from '../parser'
import { USSRawValue, USSType, USSValue } from '../types-values'

import { Color, rgbColorExpression, doRender, hexToColor } from './color'

export type RampT = [number, string][]

export const rampType = {
    type: 'opaque',
    name: 'ramp',
} satisfies USSType

export function constructRamp(ramp: [number, Color][]): USSRawValue {
    if (ramp[0][0] !== 0 || ramp[ramp.length - 1][0] !== 1) {
        throw new Error('Ramp must start at 0 and end at 1')
    }
    for (let i = 0; i < ramp.length - 1; i++) {
        if (ramp[i][0] >= ramp[i + 1][0]) {
            throw new Error(`Ramp values must be strictly increasing, found ${ramp[i][0]} >= ${ramp[i + 1][0]} at index ${i}`)
        }
    }
    return {
        type: 'opaque',
        opaqueType: 'ramp',
        value: ramp.map(([value, color]) => [value, doRender(color)] as [number, string]) satisfies RampT,
    }
}

export function divergingRamp(first: Color, last: Color, middle: Color = { r: 255, g: 255, b: 255 }): USSRawValue {
    const ramp: [number, Color][] = [
        [0, first],
        [0.5, middle],
        [1, last],
    ]
    return constructRamp(ramp)
}

export function reverseRamp(ramp: RampT): RampT {
    return ramp.slice().reverse().map(([value, color]) => [1 - value, color]) as RampT
}

export const constructRampValue: USSValue = {
    type: {
        type: 'function',
        posArgs: [
            {
                type: 'concrete',
                value: {
                    type: 'vector',
                    elementType: {
                        type: 'object',
                        properties: new Map([
                            ['value', { type: 'number' }],
                            ['color', { type: 'opaque', name: 'color' }],
                        ]),
                    },
                },
            },
        ],
        namedArgs: {},
        returnType: { type: 'concrete', value: rampType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const ramp = posArgs[0] as Map<string, USSRawValue>[]
        return constructRamp(ramp.map(item => [
            item.get('value') as number,
            (item.get('color') as { type: 'opaque', value: Color }).value,
        ]))
    },
    documentation: { humanReadableName: 'Custom Ramp' },
}

export const reverseRampValue: USSValue = {
    type: {
        type: 'function',
        posArgs: [
            {
                type: 'concrete',
                value: rampType,
            },
        ],
        namedArgs: {},
        returnType: { type: 'concrete', value: rampType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const ramp = posArgs[0] as { type: 'opaque', opaqueType: 'ramp', value: RampT }
        return {
            type: 'opaque',
            opaqueType: 'ramp',
            value: reverseRamp(ramp.value),
        }
    },
    documentation: { humanReadableName: 'Reverse Ramp' },
}

export const divergingRampValue: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            first: { type: { type: 'concrete', value: { type: 'opaque', name: 'color' } } },
            middle: {
                type: { type: 'concrete', value: { type: 'opaque', name: 'color' } },
                defaultValue: parseNoErrorAsExpression('colorWhite', ''),
            },
            last: { type: { type: 'concrete', value: { type: 'opaque', name: 'color' } } },
        },
        returnType: { type: 'concrete', value: rampType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const first = (namedArgs.first as { type: 'opaque', value: Color }).value
        const last = (namedArgs.last as { type: 'opaque', value: Color }).value
        const middle = (namedArgs.middle as { type: 'opaque', value: Color }).value
        return divergingRamp(first, last, middle)
    },
    documentation: { humanReadableName: 'Diverging Ramp' },
}

export const rampConsts: [string, USSValue][] = Object.entries(getRamps()).map(([name, ramp]) => [
    `ramp${name.replace(/\s+([a-zA-Z])/g, (_, letter: string) => letter.toUpperCase())}`,
    {
        type: rampType,
        value: { type: 'opaque', opaqueType: 'ramp', value: ramp satisfies RampT } satisfies USSRawValue,
        documentation: {
            humanReadableName: name,
            isDefault: name === 'Uridis',
            equivalentExpressions: [parseNoErrorAsExpression(
                `constructRamp([${ramp.map(([value, rampHex]) => {
                    const color = hexToColor(rampHex)
                    return `{value:${value}, color:${rgbColorExpression(color)}}`
                }).join(',')}])`,
                '',
            )],
        },
    },
])
