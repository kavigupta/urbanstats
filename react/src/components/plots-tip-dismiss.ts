import './plots.css'

export const pinnedTipClassName = 'plot-pinned-tip'
// tied to CSS (plots.css), which hides the button while a screenshot of the page is being taken
const dismissButtonClassName = 'plot-tip-dismiss'
// several tooltips can be pinned at once, so each one records which tip it is, and hence which one
// its dismiss button closes
const tipIndexAttribute = 'data-tip-index'

// unlike close.png, this icon is already the icon set's red, so it is drawn as-is rather than used
// as a mask for a themed fill the way <Icon /> does
const dismissIconSrc = '/close-red-small.png'

// side length of the icon, which is the whole button and hence also its hit target
const dismissButtonSize = 16
// keeps the button clear of the tooltip's rounded corner
const dismissButtonInset = dismissButtonSize / 2 + 2

// stamps a pinned tooltip with its index, so that a click on the dismiss button inside it can be
// traced back to the tip it closes
export function stampTipIndex(tipIndex: number): (tip: SVGElement) => void {
    return (tip) => { tip.setAttribute(tipIndexAttribute, String(tipIndex)) }
}

// the little red "x" that dismisses a pinned tooltip. Drawn into the plot's SVG rather than overlaid
// as HTML, so that it stays glued to the tooltip when the plot is scaled down to fit a narrow screen.
function createDismissButton(scale: number, tipIndex: number, onDismiss: (dismissed: number) => void): SVGElement {
    const svgNS = 'http://www.w3.org/2000/svg'
    const group = document.createElementNS(svgNS, 'g')
    group.setAttribute('class', dismissButtonClassName)
    group.setAttribute('data-test-id', 'dismiss_pinned_tooltip')
    group.setAttribute('role', 'button')
    group.setAttribute('tabindex', '0')
    group.setAttribute('aria-label', 'Dismiss tooltip')

    const size = dismissButtonSize * scale
    const image = document.createElementNS(svgNS, 'image')
    image.setAttribute('href', dismissIconSrc)
    image.setAttribute('x', String(-size / 2))
    image.setAttribute('y', String(-size / 2))
    image.setAttribute('width', String(size))
    image.setAttribute('height', String(size))
    group.appendChild(image)

    // clicks are handled by the plot-wide pointerdown listener, which sees this button's class;
    // the keyboard has no such listener to piggyback on
    group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onDismiss(tipIndex)
        }
    })
    return group
}

// the pinned tooltip whose dismiss button contains `target`, or null if `target` is not part of one
export function dismissButtonTipIndex(target: EventTarget | null): number | null {
    if (!(target instanceof Element) || target.closest(`.${dismissButtonClassName}`) === null) {
        return null
    }
    const attribute = target.closest(`g.${pinnedTipClassName}`)?.getAttribute(tipIndexAttribute)
    if (attribute === null || attribute === undefined) {
        return null
    }
    const tipIndex = Number(attribute)
    return Number.isInteger(tipIndex) ? tipIndex : null
}

// Plot sizes and places a tooltip asynchronously, once it can measure the rendered text, so where
// each tooltip's corner is -- and hence where its dismiss button goes -- is only known a frame later.
export function attachDismissButtons(plot: Element, transpose: boolean, onDismiss: (tipIndex: number) => void): void {
    // transposed plots draw at double the font size, so the buttons scale to match
    const scale = transpose ? 2 : 1
    for (const tip of Array.from(plot.querySelectorAll(`g.${pinnedTipClassName}`))) {
        const tipIndex = Number(tip.getAttribute(tipIndexAttribute))
        // the tooltip proper is the first child of the mark's group, which may also hold the leader
        // drawn back to a displaced tooltip's point -- measuring that too would misplace the button
        const drawn = tip.firstElementChild
        if (!(drawn instanceof SVGGraphicsElement) || !Number.isInteger(tipIndex)) {
            continue
        }
        const box = drawn.getBBox()
        const button = createDismissButton(scale, tipIndex, onDismiss)
        // tucked just inside the tooltip's top right corner, where the rounded corner leaves a gap
        // in the text
        const inset = dismissButtonInset * scale
        button.setAttribute('transform', `translate(${box.x + box.width - inset} ${box.y + inset})`)
        drawn.appendChild(button)
    }
}
