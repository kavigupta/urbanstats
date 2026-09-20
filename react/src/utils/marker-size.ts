/*
 * How a relative area becomes something to draw, for a map's markers and a plot's points alike: a
 * value twice another covers twice the area, so it is the square root that sets the radius.
 */

/** The radius standing for a relative area, where 1 is the largest the drawing allows. */
export function markerRadius(relativeArea: number, maxRadius: number): number {
    return Math.sqrt(relativeArea) * maxRadius
}

/** The area a marker's radius stands for, which is what clustering sums. */
export function markerArea(radius: number): number {
    return radius ** 2
}
