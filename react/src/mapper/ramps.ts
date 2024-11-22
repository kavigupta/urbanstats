import RAMPS from '../data/mapper/ramps'
// eslint-disable-next-line no-restricted-syntax -- Reexporting
export { default as RAMPS } from '../data/mapper/ramps'

export type EncodedColorMap = { type: 'none' } | { type: 'custom', custom_colormap: string } | { type: 'preset', name: string }

export type ColorMap = [number, string][]

export type Keypoints = Readonly<[number, string]>[]

export interface Ramp {
    create_ramp: (values: number[]) => Readonly<[Keypoints, number[]]>
}

interface CommonRampDescriptor {
    colormap: EncodedColorMap
    reversed?: boolean
}
export interface ConstantRampDescriptor extends CommonRampDescriptor {
    type: 'constant'
    lower_bound?: string
    upper_bound?: string
}
export type RampDescriptor = ConstantRampDescriptor | CommonRampDescriptor & { type: 'linear' } | CommonRampDescriptor & { type: 'geometric' }

export function parse_custom_colormap(custom_colormap: string): ColorMap | undefined {
    try {
        const result = JSON.parse(custom_colormap) as unknown
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

function parse_colormap(cmap: EncodedColorMap): ColorMap {
    if (cmap.type === 'none') {
    // default
        return RAMPS.Gray
    }
    else if (cmap.type === 'custom') {
        return parse_custom_colormap(cmap.custom_colormap) ?? RAMPS.Gray
    }
    else {
        if (cmap.name === '') {
            return RAMPS.Gray
        }
        return RAMPS[cmap.name]
    }
}

function parse_ramp_base(ramp: RampDescriptor): ConstantRamp | LinearRamp | GeometricRamp {
    const cmap = parse_colormap(ramp.colormap)
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

export function parse_ramp(ramp: RampDescriptor): Ramp {
    // handles modifiers like reversed
    let base: Ramp = parse_ramp_base(ramp)
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
            const new_value = (value - a0) / (b0 - a0) * (b - a) + a
            return [new_value, color]
        })
    }

    create_ramp(): Readonly<[Keypoints, number[]]> {
        return [this.values, linear_values(this.values[0][0], this.values[this.values.length - 1][0])] as const
    }
}

class LinearRamp implements Ramp {
    constructor(private readonly values: Keypoints) {
    }

    create_ramp(values: number[]): Readonly<[Keypoints, number[]]> {
        values = values.filter(x => !isNaN(x))
        const minimum = Math.min(...values)
        const maximum = Math.max(...values)
        const range = maximum - minimum
        const ramp_min = Math.min(...this.values.map(([value]) => value))
        const ramp_max = Math.max(...this.values.map(([value]) => value))
        const ramp_range = ramp_max - ramp_min
        const ramp: [number, string][] = this.values.map(x => [x[0], x[1]])
        for (const i of ramp.keys()) {
            ramp[i][0] = (ramp[i][0] - ramp_min) / ramp_range * range + minimum
        }
        return [ramp, linear_values(minimum, maximum)] as const
    }
}

function linear_values(minimum: number, maximum: number): number[] {
    const steps = 10
    const range = maximum - minimum
    const values = Array(steps).fill(0).map((_, i) => minimum + range * i / (steps - 1))
    return values
}

class GeometricRamp implements Ramp {
    constructor(private readonly values: Keypoints) {
    }

    create_ramp(values: number[]): Readonly<[Keypoints, number[]]> {
        const log_values = values.map(x => Math.log(x))
        const [log_ramp, log_ramp_values] = new LinearRamp(this.values).create_ramp(log_values)
        const ramp = log_ramp.map(x => [Math.exp(x[0]), x[1]] as const)
        const ramp_values = log_ramp_values.map(x => Math.exp(x))
        return [ramp, ramp_values] as const
    }
}

class ReversedRamp implements Ramp {
    constructor(private readonly base: Ramp) {

    }

    create_ramp(values: number[]): Readonly<[Keypoints, number[]]> {
        const [ramp, ramp_values] = this.base.create_ramp(values)
        const reversed_colors = ramp.map(x => x[1]).reverse()
        const ramp_reversed = reversed_colors.map((x, i) => [ramp[i][0], x] as const)
        return [ramp_reversed, ramp_values] as const
    }
}
