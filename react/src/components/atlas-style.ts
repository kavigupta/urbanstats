import { Polygon } from './map-common'

export function atlasStyle(color: string, fillOpacity: number): Pick<Polygon, 'color' | 'weight' | 'fillColor' | 'fillOpacity'> {
    return {
        color,
        weight: 1,
        fillColor: color,
        fillOpacity,
    }
}
