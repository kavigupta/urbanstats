import * as Plot from '@observablehq/plot'

import { assert } from '../utils/defensive'

export interface PlotRect { x: number, y: number, width: number, height: number }

// Plot's own defaults for the tip mark, needed to work out how big a tooltip will be before Plot
// lays it out
const textPadding = 8
const pointerSize = 12
// the font plotConfig gives the plot, at the size an untransposed one uses
const fontFamily = 'Jost, Arial, sans-serif'
export const plotFontSize = 16

// gap left between a displaced tooltip and whatever it was displaced past
const displacementGap = 6
const leaderHeadSize = 5

// Plot measures a tooltip only once it is in the document, which is well after the anchor has to be
// chosen, so the box is measured here instead -- the same trick the legend uses on its own labels.
let measuringContext: CanvasRenderingContext2D | null | undefined

function tipSize(title: unknown, fontSize: number): { width: number, height: number } | undefined {
    measuringContext ??= document.createElement('canvas').getContext('2d')
    const context = measuringContext
    if (context === null || typeof title !== 'string') {
        return undefined
    }
    context.font = `${fontSize}px ${fontFamily}`
    const lines = title.split('\n')
    return {
        width: Math.max(...lines.map(line => context.measureText(line).width)) + 2 * textPadding,
        height: lines.length * fontSize + 2 * textPadding,
    }
}

// where the tooltip ends up for a given anchor: the anchor names the side of the box that touches
// the point, so a `top` anchor hangs the box below it, and a `-left` one lines its left edge up
// with it. The rect covers the little pointer as well as the box, since it is drawn too.
function tipBox(anchor: Plot.FrameAnchor, x: number, y: number, size: { width: number, height: number }): PlotRect {
    const left = anchor.endsWith('-left')
        ? x
        : anchor.endsWith('-right') ? x - size.width : x - size.width / 2
    const height = size.height + pointerSize / 2
    return { x: left, y: anchor.startsWith('top') ? y : y - height, width: size.width, height }
}

function overlaps(a: PlotRect, b: PlotRect): boolean {
    return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

interface TipPlacement { anchor: Plot.FrameAnchor, dy: number }

// Plot decides which corner of its point a tooltip hangs off by fitting the box inside the SVG,
// which counts the margins -- where the title, the settings bar and the axis labels live -- as free
// space, so a tooltip near the top of the frame gets drawn across it (kavigupta/urbanstats#2083).
// We place it from the frame instead: the box grows towards the middle, hanging below a point in
// the top half and sitting above one in the bottom half, and is pushed inwards at the sides.
// The legend is drawn inside the frame, in the top left, which is exactly where the left end of a
// cumulative histogram lives, so a tooltip that would land on it is dropped below it instead and
// joined back to its point by a leader.
function placeTip(x: number, y: number, size: { width: number, height: number }, frame: PlotRect, legend: PlotRect | undefined): TipPlacement {
    const half = size.width / 2
    const sideways = x - half < frame.x ? '-left' : x + half > frame.x + frame.width ? '-right' : ''
    const anchorFor = (vertical: 'top' | 'bottom'): Plot.FrameAnchor => `${vertical}${sideways}` as Plot.FrameAnchor

    let anchor = anchorFor(y < frame.y + frame.height / 2 ? 'top' : 'bottom')
    let box = tipBox(anchor, x, y, size)
    if (legend !== undefined && overlaps(box, legend) && anchor.startsWith('bottom')) {
        // a point just below the legend: hanging the tooltip under it clears the legend outright,
        // where growing upwards would take it further in
        anchor = anchorFor('top')
        box = tipBox(anchor, x, y, size)
    }
    if (legend === undefined || !overlaps(box, legend)) {
        return { anchor, dy: 0 }
    }
    const dy = legend.y + legend.height + displacementGap - box.y
    // displacing is only worth it if the tooltip then fits between the legend and the frame's foot
    if (dy <= 0 || box.y + dy + box.height > frame.y + frame.height) {
        return { anchor, dy: 0 }
    }
    return { anchor, dy }
}

// the line from a displaced tooltip back to the point it belongs to, tipped with an arrowhead. The
// tooltip's own pointer sits at (x, y); its point is the displacement above that.
function appendLeader(tip: SVGElement, x: number, y: number, dy: number, scale: number): void {
    const head = leaderHeadSize * scale
    const pointY = y - dy
    const leader = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    leader.setAttribute('d', [
        `M${x},${y}L${x},${pointY}`,
        `M${x - head},${pointY + head * 1.5}L${x},${pointY}L${x + head},${pointY + head * 1.5}`,
    ].join(''))
    leader.setAttribute('fill', 'none')
    leader.setAttribute('stroke', tip.getAttribute('stroke') ?? 'currentColor')
    leader.setAttribute('stroke-width', String(1.5 * scale))
    leader.setAttribute('stroke-linecap', 'round')
    leader.setAttribute('stroke-linejoin', 'round')
    tip.appendChild(leader)
}

// The anchor and the displacement belong to the mark rather than to the datum, and the
// pointer-driven tip draws whichever point is being pointed at, so they are set per render rather
// than up front -- on the mark itself, which Plot reads back out when it lays the tooltip out. That
// is an internal of Plot's tip mark; should it go away, tooltips fall back to Plot's own fitting
// rather than breaking. `decorate` is handed the rendered tooltip, for callers that mark it up.
export function tipRender(options: {
    fontSize: number
    legend: PlotRect | undefined
    decorate?: (tip: SVGElement) => void
}): Plot.RenderFunction {
    return function (this: { anchor?: Plot.FrameAnchor, dy: number }, index, scales, values, dimensions, context, next) {
        assert(next !== undefined, 'tipRender is a render transform, so it is passed a next')
        const placed = placementFor(index, values, dimensions, options)
        if (placed !== undefined) {
            this.anchor = placed.placement.anchor
            this.dy = placed.placement.dy
        }
        const tip = next(index, scales, values, dimensions, context)
        if (tip === null) {
            return null
        }
        options.decorate?.(tip)
        if (placed !== undefined && placed.placement.dy !== 0) {
            const { pointer, placement } = placed
            // Plot sizes and positions the tooltip on a later task, and anything added to it before
            // then is taken for part of the tooltip, so the leader waits for the next frame
            requestAnimationFrame(() => {
                appendLeader(tip, pointer.x, pointer.y, placement.dy, options.fontSize / plotFontSize)
            })
        }
        return tip
    }
}

// the placement of the tooltip being rendered, and where its pointer sits within the mark's own
// coordinates -- which is the point's position before the displacement is applied to the whole mark
function placementFor(
    index: number[],
    values: Plot.ChannelValues,
    dimensions: Plot.Dimensions,
    options: { fontSize: number, legend: PlotRect | undefined },
): { placement: TipPlacement, pointer: { x: number, y: number } } | undefined {
    const [i] = index
    // an empty index (the pointer is over nothing) leaves no tooltip to place
    const pointX: unknown = values.x?.[i]
    const pointY: unknown = values.y?.[i]
    if (typeof pointX !== 'number' || typeof pointY !== 'number') {
        return undefined
    }
    const size = tipSize(values.title?.[i], options.fontSize)
    if (size === undefined) {
        return undefined
    }
    const frame = {
        x: dimensions.marginLeft,
        y: dimensions.marginTop,
        width: dimensions.width - dimensions.marginLeft - dimensions.marginRight,
        height: dimensions.height - dimensions.marginTop - dimensions.marginBottom,
    }
    // Plot rounds the point to whole pixels for crisp edges; the leader has to line up with it
    const pointer = { x: Math.round(pointX), y: Math.round(pointY) }
    return { placement: placeTip(pointer.x, pointer.y, size, frame, options.legend), pointer }
}
