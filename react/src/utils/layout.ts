export function totalOffset(element: Element | null): { top: number, left: number } {
    if (!(element instanceof HTMLElement)) {
        return { top: 0, left: 0 }
    }
    const parentOffset = totalOffset(element.offsetParent)
    return { top: element.offsetTop + parentOffset.top, left: element.offsetLeft + parentOffset.left }
}
