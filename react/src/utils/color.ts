import Color from 'color'

import { Keypoints } from '../mapper/ramps'

import { assert } from './defensive'

export function randomColor(name: string): string {
    // randomly choose a color hex code where H is between 0 and 360,
    // S is between 50 and 100, and L is between 20 and 50
    // seed random with the hash of longname

    let seed = 0
    for (let j = 0; j < name.length; j++) {
        seed += name.charCodeAt(j)
        seed *= 31
        seed %= 1000000007
    }
    function random(): number {
        const x = Math.sin(seed++) * 10000
        return x - Math.floor(x)
    }

    return `hsl(${random() * 360}, ${50 + random() * 50}%, ${20 + random() * 30}%)`
}

export function interpolateColor(ramp: Keypoints, item: number, color?: string): string {
    // ramp is a list of [value, color] pairs
    // item is a value

    // interpolates in RGB space between the two closest colors in the ramp

    if (isNaN(item)) {
        assert(color !== undefined, 'item is NaN and no color provided')
        return color
    }

    if (ramp.length === 0) {
        assert(color !== undefined, 'item is NaN and no color provided')
        return color
    }

    let i = 0
    while (i < ramp.length && item > ramp[i][0]) {
        i++
    }
    if (i === 0) {
        return ramp[0][1]
    }
    if (i === ramp.length) {
        return ramp[ramp.length - 1][1]
    }
    const [value1, color1] = ramp[i - 1]
    const [value2, color2] = ramp[i]
    const fraction = (item - value1) / (value2 - value1)
    const r1 = parseInt(color1.slice(1, 3), 16)
    const g1 = parseInt(color1.slice(3, 5), 16)
    const b1 = parseInt(color1.slice(5, 7), 16)
    const r2 = parseInt(color2.slice(1, 3), 16)
    const g2 = parseInt(color2.slice(3, 5), 16)
    const b2 = parseInt(color2.slice(5, 7), 16)
    const r = Math.round(r1 + fraction * (r2 - r1))
    const g = Math.round(g1 + fraction * (g2 - g1))
    const b = Math.round(b1 + fraction * (b2 - b1))
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function mixWithBackground(color: string, fraction: number, background: string): string {
    if (!(typeof color === 'string')) {
        throw new Error('color is not a string')
    }
    const ramp: [number, string][] = [[0, color], [1, background]]
    return interpolateColor(ramp, fraction)
}

type LABColor = [number, number, number]

export function furthestColor(fromColors: string[]): string {
    // tries every 16 * 16 * 16 color and finds the one that maximizes the minimum distance to any of the given colors
    const avoidColors: LABColor[] = fromColors.map(color => Color(color).lab().array() as LABColor)
    let bestColor: [number, number, number] = [0, 0, 0]
    let bestDistance = 0
    for (let r = 0; r < 256; r += 17) {
        for (let g = 0; g < 256; g += 17) {
            for (let b = 0; b < 256; b += 17) {
                const candidate = Color.rgb(r, g, b).lab().array() as LABColor
                const minDistance = avoidColors.reduce((result, color) => Math.min(result, colorDistance(color, candidate)), 0)
                if (minDistance > bestDistance) {
                    bestDistance = minDistance
                    bestColor = [r, g, b]
                }
            }
        }
    }
    return `#${bestColor[0].toString(16).padStart(2, '0')}${bestColor[1].toString(16).padStart(2, '0')}${bestColor[2].toString(16).padStart(2, '0')}`
}

function colorDistance(c1: LABColor, c2: LABColor): number {
    // compute lab color distance
    return Math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2)
}
