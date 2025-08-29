import { assert } from '../../utils/defensive'

export function hexToColor(hex: string): Color {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    assert(hex.startsWith('#') && (hex.length === 7 || hex.length === 9), `Invalid hex color: ${hex}`)
    const a = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) : 255
    return { r, g, b, a }
} export interface Color { r: number, g: number, b: number, a: number }
