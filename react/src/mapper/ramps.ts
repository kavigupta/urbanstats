import RAMPS from '../data/mapper/ramps'
// eslint-disable-next-line no-restricted-syntax -- Reexporting
export { default as RAMPS } from '../data/mapper/ramps'

// eslint-disable-next-line no-restricted-syntax -- Represents encoded data
export type EncodedColorMap = { type: 'none' } | { type: 'custom', custom_colormap: string } | { type: 'preset', name: string }

export type ColorMap = [number, string][]

export type Keypoints = Readonly<[number, string]>[]

export interface Ramp {
    createRamp: (values: number[]) => Readonly<[Keypoints, number[]]>
}

interface CommonRampDescriptor {
    colormap: EncodedColorMap
    reversed?: boolean
}
/* eslint-disable no-restricted-syntax -- Represents encoded data */
export interface ConstantRampDescriptor extends CommonRampDescriptor {
    type: 'constant'
    lower_bound?: string
    upper_bound?: string
}
/* eslint-enable no-restricted-syntax */
export type RampDescriptor = ConstantRampDescriptor | CommonRampDescriptor & { type: 'linear' } | CommonRampDescriptor & { type: 'geometric' }

export function parseCustomColormap(customColormap: string): ColorMap | undefined {
    try {
        const result = JSON.parse(customColormap) as unknown
        if (result instanceof Array
            && result.every(x => x instanceof Array
            && x.length === 2
            && typeof x[0] === 'number'
            && typeof x[1] === 'string'
            && (/^#[0-9a-f]{6}$/i.exec(x[1])) !== null,
            )) {
            return result as ColorMap
        }
    }
    catch (e) {
        console.error('error! in_parse_custom_colormap', e)
    }
    return undefined
}

function parseColormap(cmap: EncodedColorMap): ColorMap {
    if (cmap.type === 'none') {
    // default
        return RAMPS.Gray
    }
    else if (cmap.type === 'custom') {
        return parseCustomColormap(cmap.custom_colormap) ?? RAMPS.Gray
    }
    else {
        if (cmap.name === '') {
            return RAMPS.Gray
        }
        return RAMPS[cmap.name]
    }
}

function parseRampBase(ramp: RampDescriptor): ConstantRamp | LinearRamp | GeometricRamp {
    const cmap = parseColormap(ramp.colormap)
    if (ramp.type === 'constant') {
        return new ConstantRamp(cmap,
            ramp.lower_bound === undefined || ramp.lower_bound === '' ? 0 : parseFloat(ramp.lower_bound),
            ramp.upper_bound === undefined || ramp.upper_bound === '' ? 1 : parseFloat(ramp.upper_bound),
        )
    }
    else if (ramp.type === 'linear') {
        return new LinearRamp(cmap)
    }
    else {
        return new GeometricRamp(cmap)
    }
}

export function parseRamp(ramp: RampDescriptor): Ramp {
    // handles modifiers like reversed
    let base: Ramp = parseRampBase(ramp)
    if (ramp.reversed) {
        base = new ReversedRamp(base)
    }
    return base
}

class ConstantRamp implements Ramp {
    private readonly values: Keypoints

    constructor(keypoints: ColorMap, a: number, b: number) {
        const a0 = keypoints[0][0]
        const b0 = keypoints[keypoints.length - 1][0]
        this.values = keypoints.map(([value, color]) => {
            const newValue = (value - a0) / (b0 - a0) * (b - a) + a
            return [newValue, color]
        })
    }

    createRamp(): Readonly<[Keypoints, number[]]> {
        return [this.values, linearValues(this.values[0][0], this.values[this.values.length - 1][0])] as const
    }
}

class LinearRamp implements Ramp {
    constructor(private readonly values: Keypoints) {
    }

    createRamp(values: number[]): Readonly<[Keypoints, number[]]> {
        values = values.filter(x => !isNaN(x))
        const minimum = Math.min(...values)
        const maximum = Math.max(...values)
        const range = maximum - minimum
        const rampMin = Math.min(...this.values.map(([value]) => value))
        const rampMax = Math.max(...this.values.map(([value]) => value))
        const rampRange = rampMax - rampMin
        const ramp: [number, string][] = this.values.map(x => [x[0], x[1]])
        for (const i of ramp.keys()) {
            ramp[i][0] = (ramp[i][0] - rampMin) / rampRange * range + minimum
        }
        return [ramp, linearValues(minimum, maximum)] as const
    }
}

function linearValues(minimum: number, maximum: number): number[] {
    const steps = 10
    const range = maximum - minimum
    const values = Array(steps).fill(0).map((_, i) => minimum + range * i / (steps - 1))
    return values
}

class GeometricRamp implements Ramp {
    constructor(private readonly values: Keypoints) {
    }

    createRamp(values: number[]): Readonly<[Keypoints, number[]]> {
        const logValues = values.map(x => Math.log(x))
        const [lobRamp, logRampValues] = new LinearRamp(this.values).createRamp(logValues)
        const ramp = lobRamp.map(x => [Math.exp(x[0]), x[1]] as const)
        const rampValues = logRampValues.map(x => Math.exp(x))
        return [ramp, rampValues] as const
    }
}

class ReversedRamp implements Ramp {
    constructor(private readonly base: Ramp) {

    }

    createRamp(values: number[]): Readonly<[Keypoints, number[]]> {
        const [ramp, rampValues] = this.base.createRamp(values)
        const reversedColors = ramp.map(x => x[1]).reverse()
        const rampReversed = reversedColors.map((x, i) => [ramp[i][0], x] as const)
        return [rampReversed, rampValues] as const
    }
}
