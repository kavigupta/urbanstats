/*
 * The clustering parameters the page draws with. The link-embed card replicates the page's
 * clustering with its own supercluster, so these have to come from one place or the card and the
 * page silently disagree.
 */

/** Where clustering stops and each point is drawn on its own. */
export const clusterMaxZoom = 14

/** The grouping radius, in pixels of a 512px tile. */
export function clusterRadius(maxRadius: number, clusterRadiusSpacing: number): number {
    return maxRadius * (1 + clusterRadiusSpacing / 100)
}

export function proportionalRelativeArea(area: number, maxArea: number): number {
    return maxArea > 0 ? area / maxArea : 1
}

/** A marker's slices, from twelve o'clock clockwise, leaving out categories with no share. */
export function pieSlices(sizes: number[]): { category: number, from: number, to: number }[] {
    const total = sizes.reduce((sum, size) => sum + size, 0)
    let angle = -Math.PI / 2
    return sizes.flatMap((size, category) => {
        if (size === 0) {
            return []
        }
        const from = angle
        angle += size / total * 2 * Math.PI
        return [{ category, from, to: angle }]
    })
}

/** SVG path data for one slice. Slices overlap slightly so no seam shows between them. */
export function pieSlicePath(cx: number, cy: number, radius: number, from: number, to: number): string {
    const span = to - from
    const r = radius.toFixed(1)
    const point = (angle: number): string =>
        `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`
    // Padding a near-whole slice past a whole turn would leave SVG solving for the wrong circle.
    const pad = Math.min(span * 0.01, Math.max(0, (2 * Math.PI - span) / 2 - 0.02))
    const start = point(from - pad)
    const end = point(to + pad)
    // SVG drops an arc whose endpoints coincide, so a slice that comes back to where it started is
    // drawn as the whole pie. An arc cannot span more than half a turn unambiguously, so a whole
    // pie takes two of them.
    if (start === end && span > Math.PI) {
        return `M${point(0)}A${r},${r} 0 1,1 ${point(Math.PI)}A${r},${r} 0 1,1 ${point(0)}z`
    }
    const large = span + 2 * pad > Math.PI ? 1 : 0
    return `M${cx.toFixed(1)},${cy.toFixed(1)}L${start}A${r},${r} 0 ${large},1 ${end}z`
}
