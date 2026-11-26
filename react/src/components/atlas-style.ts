import Color from 'color'

import { Polygon } from './map-common'

export const haloOpacity = 0.35

export function atlasStyle(color: string, fillOpacity: number, halo: boolean): Pick<Polygon, 'color' | 'weight' | 'haloColor' | 'haloWidth' | 'fillColor' | 'fillOpacity'> {
    return {
        color: halo ? Color(color).darken(0.4).hex() : color,
        weight: 1,
        ...(halo ? { haloColor: color, haloWidth: 8 } : {}),
        fillColor: color,
        fillOpacity,
    }
}
