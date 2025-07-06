import ColorLib from 'color'

import hueColors from '../../data/hueColors'
import { Context } from '../context'
import { USSRawValue, USSType, USSValue } from '../types-values'

import { camelToHuman } from './utils'

export interface Color { r: number, g: number, b: number }
export const colorType = { type: 'opaque', name: 'color' } satisfies USSType

function hexToColor(hex: string): Color {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
}

function rgbToColor(red: number, green: number, blue: number): Color {
    if (red < 0 || red > 1 || green < 0 || green > 1 || blue < 0 || blue > 1) {
        throw new Error(`RGB values must be between 0 and 1, got (${red}, ${green}, ${blue})`)
    }
    const r = Math.round(red * 255)
    const g = Math.round(green * 255)
    const b = Math.round(blue * 255)
    return { r, g, b }
}

export const rgb = {
    type: {
        type: 'function',
        posArgs: [
            { type: 'concrete', value: { type: 'number' } }, // red
            { type: 'concrete', value: { type: 'number' } }, // green
            { type: 'concrete', value: { type: 'number' } }, // blue
        ],
        namedArgs: {},
        returnType: { type: 'concrete', value: colorType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        return { type: 'opaque', value: rgbToColor(posArgs[0] as number, posArgs[1] as number, posArgs[2] as number) }
    },
    documentation: { humanReadableName: 'Color (RGB)' },
} satisfies USSValue

export const hsv = {
    type: {
        type: 'function',
        posArgs: [
            { type: 'concrete', value: { type: 'number' } }, // hue
            { type: 'concrete', value: { type: 'number' } }, // saturation
            { type: 'concrete', value: { type: 'number' } }, // lightness
        ],
        namedArgs: {},
        returnType: { type: 'concrete', value: colorType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const hue = posArgs[0] as number
        const saturation = posArgs[1] as number
        const value = posArgs[2] as number
        if (hue < 0 || hue > 360 || saturation < 0 || saturation > 1 || value < 0 || value > 1) {
            throw new Error(`HSL values must be (hue: 0-360, saturation: 0-1, lightness: 0-1), got (${hue}, ${saturation}, ${value})`)
        }
        // Convert HSL to RGB using color library
        const color = ColorLib.hsv(hue, saturation * 100, value * 100)
        const rgbValues = color.rgb().object()
        return { type: 'opaque', value: rgbToColor(rgbValues.r / 255, rgbValues.g / 255, rgbValues.b / 255) }
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
        const color = (posArgs[0] as { type: 'opaque', value: { r: number, g: number, b: number } }).value
        return doRender(color)
    },
    documentation: { humanReadableName: 'Color to String' },
} satisfies USSValue

export function doRender(color: Color): string {
    const hex = (x: number): string => {
        const hexValue = x.toString(16)
        return hexValue.length === 1 ? `0${hexValue}` : hexValue
    }
    return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`
}

function colorConstant(name: string, value: string): [string, USSValue] {
    const humanReadableName = camelToHuman(name)
    return [`color_${name}`, { type: colorType, value: { type: 'opaque', value: hexToColor(value) }, documentation: { humanReadableName } }] satisfies [string, USSValue]
}

export const colorConstants = [
    ...Object.entries(hueColors).map(([name, value]) => colorConstant(name, value)),
    // eslint-disable-next-line no-restricted-syntax -- Allow hex colors for constants
    colorConstant('white', '#ffffff'),
    // eslint-disable-next-line no-restricted-syntax -- Allow hex colors for constants
    colorConstant('black', '#000000'),
]
