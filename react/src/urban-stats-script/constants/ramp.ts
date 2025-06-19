import { Context } from '../context'
import { USSRawValue, USSType, USSValue } from '../types-values'

import { Color, doRender } from './color'

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
        value: ramp.map(([value, color]) => [value, doRender(color)] as [number, string]),
    }
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
}
