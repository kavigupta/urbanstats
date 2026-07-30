import { Colors } from '../page_template/color-themes'

import './plots.css'

export const pinnedTipClassName = 'plot-pinned-tip'
// tied to CSS (plots.css), which hides the button while a screenshot of the page is being taken
const dismissButtonClassName = 'plot-tip-dismiss'

const dismissIconSrc = '/close.png'
// SVG masks are referenced by id, and there is one dismiss button per plot on the page
let dismissIconCount = 0

// the little "x" that dismisses a pinned tooltip. Drawn into the plot's SVG rather than overlaid as
// HTML, so that it stays glued to the tooltip when the plot is scaled down to fit a narrow screen.
function createDismissButton(colors: Colors, scale: number, onDismiss: () => void): SVGElement {
    const svgNS = 'http://www.w3.org/2000/svg'
    const group = document.createElementNS(svgNS, 'g')
    group.setAttribute('class', dismissButtonClassName)
    group.setAttribute('data-test-id', 'dismiss_pinned_tooltip')
    group.setAttribute('role', 'button')
    group.setAttribute('tabindex', '0')
    group.setAttribute('aria-label', 'Dismiss tooltip')

    const radius = 8 * scale
    const background = document.createElementNS(svgNS, 'circle')
    background.setAttribute('r', String(radius))
    background.setAttribute('fill', colors.slightlyDifferentBackground)
    background.setAttribute('stroke', colors.textMain)
    group.appendChild(background)

    // the icon is white with transparency, like the rest of the icon set, so it is used as a mask
    // for the theme's text color rather than drawn directly -- the same trick as <Icon />
    const size = radius * 1.1
    const maskId = `${dismissButtonClassName}-mask-${dismissIconCount++}`
    const mask = document.createElementNS(svgNS, 'mask')
    mask.setAttribute('id', maskId)
    const image = document.createElementNS(svgNS, 'image')
    image.setAttribute('href', dismissIconSrc)
    image.setAttribute('x', String(-size / 2))
    image.setAttribute('y', String(-size / 2))
    image.setAttribute('width', String(size))
    image.setAttribute('height', String(size))
    mask.appendChild(image)
    group.appendChild(mask)

    const cross = document.createElementNS(svgNS, 'rect')
    cross.setAttribute('x', String(-size / 2))
    cross.setAttribute('y', String(-size / 2))
    cross.setAttribute('width', String(size))
    cross.setAttribute('height', String(size))
    cross.setAttribute('fill', colors.textMain)
    cross.setAttribute('mask', `url(#${maskId})`)
    group.appendChild(cross)

    // clicks are handled by the plot-wide pointerdown listener, which sees this button's class;
    // the keyboard has no such listener to piggyback on
    group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onDismiss()
        }
    })
    return group
}

export function isDismissButton(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(`.${dismissButtonClassName}`) !== null
}

// Plot sizes and places a tooltip asynchronously, once it can measure the rendered text, so where
// the tooltip's corner is -- and hence where the dismiss button goes -- is only known a frame later.
export function attachDismissButton(plot: Element, colors: Colors, transpose: boolean, onDismiss: () => void): void {
    const tip = plot.querySelector(`g.${pinnedTipClassName}`)
    if (!(tip instanceof SVGGraphicsElement)) {
        return
    }
    const box = tip.getBBox()
    // hung half in and half out of the tooltip's top right corner, where the rounded corner leaves
    // a gap in the text. Transposed plots draw at double the font size, so scale to match.
    const button = createDismissButton(colors, transpose ? 2 : 1, onDismiss)
    button.setAttribute('transform', `translate(${box.x + box.width} ${box.y})`)
    tip.appendChild(button)
}
