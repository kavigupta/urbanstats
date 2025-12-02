import ColorLib from 'color'
import { round as doRound } from 'mathjs'

import { assert } from '../../utils/defensive'

export function hexToColor(hex: string, round?: number): Color {
    const maybeRound: (num: number) => number = num => round !== undefined ? (Math.round(num * Math.pow(10, round)) / Math.pow(10, round)) : num
    const r = maybeRound(parseInt(hex.slice(1, 3), 16) / 255)
    const g = maybeRound(parseInt(hex.slice(3, 5), 16) / 255)
    const b = maybeRound(parseInt(hex.slice(5, 7), 16) / 255)
    assert(hex.startsWith('#') && (hex.length === 7 || hex.length === 9), `Invalid hex color: ${hex}`)
    const a = maybeRound(hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1)
    return { r, g, b, a }
}

export type Color =
    { r: number, g: number, b: number, a: number } |
    { h: number, s: number, v: number, a: number }

export function toRgb(color: Color): { r: number, g: number, b: number, a: number } {
    if ('r' in color) {
        return color
    }
    const converted = ColorLib.hsv(color.h, color.s * 100, color.v * 100)
    return {
        // Sometimes the conversion goes out of bounds
        r: converted.red() / 255,
        g: converted.green() / 255,
        b: converted.blue() / 255,
        a: color.a,
    }
}

export function toHsv(color: Color): { h: number, s: number, v: number, a: number } {
    if ('v' in color) {
        return color
    }
    const converted = ColorLib.rgb(color.r * 255, color.g * 255, color.b * 255)
    return {
        h: converted.hue(),
        s: converted.saturationv() / 100,
        v: converted.value() / 100,
        a: color.a,
    }
}

function drawFunction(functionName: string, param1: number, param2: number, param3: number, alpha: number, round?: number): string {
    const format: (num: number) => string = round !== undefined ? num => doRound(num, round).toString() : num => num.toString()
    const alphaPart = alpha !== 1 ? `, a=${format(alpha)}` : ''
    return `${functionName}(${format(param1)}, ${format(param2)}, ${format(param3)}${alphaPart})`
}

export function rgbColorExpression(color: Color, { forceAlpha, round }: { forceAlpha?: number, round?: number } = {}): string {
    const { r, g, b, a } = toRgb(color)
    return drawFunction('rgb', r, g, b, forceAlpha ?? a, round)
}

export function hsvColorExpression(color: Color, { forceAlpha, round }: { forceAlpha?: number, round?: number } = {}): string {
    const { h, s, v, a } = toHsv(color)
    return drawFunction('hsv', h, s, v, forceAlpha ?? a, round)
}

export function deconstructColor(color: Color): string {
    if ('r' in color) {
        return drawFunction('rgb', color.r, color.g, color.b, color.a, 3)
    }
    if ('h' in color) {
        return drawFunction('hsv', color.h, color.s, color.v, color.a, 3)
    }
    throw new Error()
}

export function doRender(color: Color, ignoreAlpha?: boolean): string {
    const hex = (x: number): string => {
        x = Math.round(x * 255)
        const hexValue = x.toString(16)
        return hexValue.length === 1 ? `0${hexValue}` : hexValue
    }
    const { r, g, b, a } = toRgb(color)
    let h = `#${hex(r)}${hex(g)}${hex(b)}`
    if (a !== 1 && !ignoreAlpha) {
        h += hex(a)
    }
    return h
}
