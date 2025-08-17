import ColorLib from 'color'

import hueColors from '../../data/hueColors'
import { Context } from '../context'
import { parseNoErrorAsExpression } from '../parser'
import { USSRawValue, USSType, USSValue, createConstantExpression } from '../types-values'

import { Color, hexToColor } from './color-utils'
import { camelToHuman } from './utils'

export const colorType = { type: 'opaque', name: 'color' } satisfies USSType

export function rgbToColor(red: number, green: number, blue: number, alpha: number, tolerateError: true): Color | undefined
export function rgbToColor(red: number, green: number, blue: number, alpha: number): Color
export function rgbToColor(red: number, green: number, blue: number, alpha: number, tolerateError?: boolean): Color | undefined {
    if (red < 0 || red > 1 || green < 0 || green > 1 || blue < 0 || blue > 1 || alpha < 0 || alpha > 1) {
        if (tolerateError) {
            return undefined
        }
        throw new Error(`RGB values must be between 0 and 1, got (${red}, ${green}, ${blue}, ${alpha})`)
    }
    const r = Math.round(red * 255)
    const g = Math.round(green * 255)
    const b = Math.round(blue * 255)
    const a = Math.round(alpha * 255)
    return { r, g, b, a }
}

export function hsvToColor(hue: number, saturation: number, value: number, alpha: number, tolerateError: true): Color | undefined
export function hsvToColor(hue: number, saturation: number, value: number, alpha: number): Color
export function hsvToColor(hue: number, saturation: number, value: number, alpha: number, tolerateError?: boolean): Color | undefined {
    if (hue < 0 || hue > 360 || saturation < 0 || saturation > 1 || value < 0 || value > 1 || alpha < 0 || alpha > 1) {
        if (tolerateError) {
            return undefined
        }
        throw new Error(`HSV values must be (hue: 0-360, saturation: 0-1, value: 0-1, alpha: 0-1), got (${hue}, ${saturation}, ${value}, ${alpha})`)
    }
    const color = ColorLib.hsv(hue, saturation * 100, value * 100)
    return {
        r: Math.round(color.red()),
        g: Math.round(color.green()),
        b: Math.round(color.blue()),
        a: Math.round(alpha * 255),
    }
}

export const rgb = {
    type: {
        type: 'function',
        posArgs: [
            { type: 'concrete', value: { type: 'number' } }, // red
            { type: 'concrete', value: { type: 'number' } }, // green
            { type: 'concrete', value: { type: 'number' } }, // blue
        ],
        namedArgs: {
            a: { type: { type: 'concrete', value: { type: 'number' } }, defaultValue: createConstantExpression(1) },
        },
        returnType: { type: 'concrete', value: colorType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const alpha = namedArgs.a as number
        return { type: 'opaque', opaqueType: 'color', value: rgbToColor(posArgs[0] as number, posArgs[1] as number, posArgs[2] as number, alpha) }
    },
    documentation: {
        humanReadableName: 'Color (RGB)',
        namedArgs: { a: 'Alpha' },
    },
} satisfies USSValue

export const hsv = {
    type: {
        type: 'function',
        posArgs: [
            { type: 'concrete', value: { type: 'number' } }, // hue
            { type: 'concrete', value: { type: 'number' } }, // saturation
            { type: 'concrete', value: { type: 'number' } }, // value
        ],
        namedArgs: {
            a: { type: { type: 'concrete', value: { type: 'number' } }, defaultValue: createConstantExpression(1) },
        },
        returnType: { type: 'concrete', value: colorType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const alpha = namedArgs.a as number
        return { type: 'opaque', opaqueType: 'color', value: hsvToColor(posArgs[0] as number, posArgs[1] as number, posArgs[2] as number, alpha) }
    },
    documentation: { humanReadableName: 'Color (HSV)' },
} satisfies USSValue

export const renderColor = {
    type: {
        type: 'function',
        posArgs: [{ type: 'concrete', value: colorType }],
        namedArgs: {},
        returnType: { type: 'concrete', value: { type: 'string' } },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): string => {
        const color = (posArgs[0] as { type: 'opaque', value: { r: number, g: number, b: number, a: number } }).value
        return doRender(color)
    },
    documentation: { humanReadableName: 'Color to String' },
} satisfies USSValue

export function doRender(color: Color, ignoreAlpha?: boolean): string {
    const hex = (x: number): string => {
        const hexValue = x.toString(16)
        return hexValue.length === 1 ? `0${hexValue}` : hexValue
    }
    let h = `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`
    if (color.a !== 255 && !ignoreAlpha) {
        h += hex(color.a)
    }
    return h
}

function drawFunction(functionName: string, param1: number, param2: number, param3: number, alpha: number): string {
    const alphaPart = alpha !== 255 ? `, a=${alpha / 255}` : ''
    return `${functionName}(${param1}, ${param2}, ${param3}${alphaPart})`
}

export function rgbColorExpression(color: Color, forceAlpha?: number): string {
    return drawFunction('rgb', color.r / 255, color.g / 255, color.b / 255, forceAlpha ?? color.a)
}

export function hsvColorExpression(color: Color, forceAlpha?: number): string {
    const c = ColorLib.rgb(color.r, color.g, color.b)
    return drawFunction('hsv', c.hue(), c.saturationv() / 100, c.value() / 100, forceAlpha ?? color.a)
}

function colorConstant(name: string, value: string, isDefault?: boolean): [string, USSValue] {
    const humanReadableName = camelToHuman(name)
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1)
    const color = hexToColor(value)
    return [`color${capitalizedName}`, {
        type: colorType,
        value: { type: 'opaque', opaqueType: 'color', value: color },
        documentation: {
            humanReadableName,
            equivalentExpressions: [parseNoErrorAsExpression(rgbColorExpression(color), ''), parseNoErrorAsExpression(hsvColorExpression(color), '')],
            isDefault,
        },
    }] satisfies [string, USSValue]
}

export const colorConstants = [
    ...Object.entries(hueColors).map(([name, value]) => colorConstant(name, value)),
    // eslint-disable-next-line no-restricted-syntax -- Allow hex colors for constants
    colorConstant('white', '#ffffff'),
    // eslint-disable-next-line no-restricted-syntax -- Allow hex colors for constants
    colorConstant('black', '#000000', true),
]
