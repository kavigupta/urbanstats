import { Keypoints } from '../mapper/ramps'

export function random_color(name: string): string {
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

export function interpolate_color(ramp: Keypoints, item: number): string {
    // ramp is a list of [value, color] pairs
    // item is a value

    // interpolates in RGB space between the two closest colors in the ramp

    if (isNaN(item)) {
        return '#000000'
    }

    if (ramp.length === 0) {
        return '#000000'
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
    return interpolate_color(ramp, fraction)
}
