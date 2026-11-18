/** Footnote markers: *, †, ‡, then base-3 combinations (**, *†, *‡, †*, …). */
export function footnoteSymbol(index: number): string {
    let length = 1
    while (true) {
        if (index < Math.pow(3, length)) {
            return ofLength(index, length)
        }
        index -= Math.pow(3, length)
        length++
    }
}

function ofLength(index: number, length: number): string {
    const digits = ['*', '†', '‡']
    const result = []
    for (let i = 0; i < length; i++) {
        result.unshift(digits[index % 3])
        index = Math.floor(index / 3)
    }
    return result.join('')
}
