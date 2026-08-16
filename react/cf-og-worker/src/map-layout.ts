// Where a shape sits on the map, shared by the basemap and the outline drawn over it.

/** A closed ring of [lon, lat] pairs. */
export type Ring = [number, number][]

export const tileSize = 256

/** Past this the tiles stop adding detail, so a shape smaller than the box just stays smaller. */
const maxZoom = 17

/*
 * Web Mercator, as the site's maps use. Shapes crossing the antimeridian carry longitudes past
 * ±180 rather than wrapping, so x runs outside [0, 1] for them and the fit below stays tight;
 * `coveringTiles` wraps the tile x it asks for, which is where the world is round again.
 */
export function project([lon, lat]: [number, number]): [number, number] {
    const x = (lon + 180) / 360
    const clamped = Math.max(-85.05, Math.min(85.05, lat)) * Math.PI / 180
    const y = (1 - Math.log(Math.tan(clamped) + 1 / Math.cos(clamped)) / Math.PI) / 2
    return [x, y]
}

export interface MapLayout {
    /** Box pixels per unit of projected space, chosen so the rings fill the box. */
    scale: number
    /** The zoom the map reads as, which line widths and label sizes are picked against. */
    zoom: number
    /** The box's top-left corner, in that same scaled space. */
    originX: number
    originY: number
}

export function fitRings(rings: Ring[], width: number, height: number): MapLayout {
    // A loop rather than Math.min(...xs): a country's outline carries more points than an argument
    // list takes, and the RangeError would land as a card that silently fell back.
    let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity]
    for (const ring of rings) {
        for (const point of ring) {
            const [x, y] = project(point)
            minX = Math.min(minX, x)
            maxX = Math.max(maxX, x)
            minY = Math.min(minY, y)
            maxY = Math.max(maxY, y)
        }
    }

    const pad = 8
    const fit = Math.min((width - pad * 2) / (maxX - minX || 1), (height - pad * 2) / (maxY - minY || 1))
    const zoom = Math.max(0, Math.min(maxZoom, Math.round(Math.log2(fit / tileSize))))
    const scale = Math.min(fit, tileSize * 2 ** (zoom + 1))
    return {
        scale,
        zoom,
        originX: (minX + maxX) / 2 * scale - width / 2,
        originY: (minY + maxY) / 2 * scale - height / 2,
    }
}

/** Projects a point into the card's map box. */
export function place(layout: MapLayout, point: [number, number]): [number, number] {
    const [x, y] = project(point)
    return [x * layout.scale - layout.originX, y * layout.scale - layout.originY]
}
