import RAMPS from '../data/mapper/ramps'
import { RampT } from '../urban-stats-script/constants/ramp'

// eslint-disable-next-line no-restricted-syntax -- Represents encoded data
export type EncodedColorMap = { type: 'none' } | { type: 'custom', custom_colormap: string } | { type: 'preset', name: string }

export type ColorMap = [number, string][]

export type Keypoints = Readonly<[number, string]>[]

export interface Ramp {
    createRamp: (values: number[]) => Readonly<[Keypoints, number[]]>
}

export function getRamps(): Record<string, RampT> {
    return RAMPS
}
