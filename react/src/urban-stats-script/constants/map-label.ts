import { USSRawValue, USSType } from '../types-values'

import { RichText } from './rich-text'

export interface MapLabel {
    bottomLeft: [number, number]
    topRight: [number, number]
    text: RichText
    backgroundColor: string
    borderColor: string
    borderWidth: number
}

export const mapLabelType = {
    type: 'opaque',
    name: 'mapLabel',
} satisfies USSType

export function constructMapLabel(
    label: MapLabel,
): USSRawValue {
    return {
        type: 'opaque',
        opaqueType: 'mapLabel',
        value: label,
    }
}
