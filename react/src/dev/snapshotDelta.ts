import { createTwoFilesPatch } from 'diff'

export interface RGBAImage { width: number, height: number, data: Uint8Array }

export function isImage(file: string): boolean {
    return file.endsWith('.png')
}

export function isText(file: string): boolean {
    return /\.(csv|txt|json|xml)(\.gz)?$/.test(file)
}

/**
 * Handles the special case where one image has an extra row of pixels at the bottom
 * that is identical to the row above it. This causes test flakes but does not reflect
 * a meaningful semantic difference in the images.
 */
function trimExtraRow(ref: RGBAImage, act: RGBAImage): [RGBAImage, RGBAImage] {
    if (Math.abs(ref.height - act.height) !== 1) {
        return [ref, act]
    }
    const shorter = ref.height < act.height ? ref : act
    const rowBytes = shorter.width * 4
    const lastRow = (shorter.height - 1) * rowBytes
    for (let i = 0; i < rowBytes; i++) {
        if (shorter.data[lastRow + i] !== shorter.data[lastRow - rowBytes + i]) {
            return [ref, act]
        }
    }
    const height = shorter.height
    const crop = (image: RGBAImage): RGBAImage => ({ width: image.width, height, data: image.data.subarray(0, image.width * height * 4) })
    return [crop(ref), crop(act)]
}

// Ignore when images have a very small difference, typically due to aliasing.
const differenceThreshold = 15

function totalDifferenceUpTo(a: Uint8Array, b: Uint8Array, limit: number): number {
    let total = 0
    for (let i = 0; i < a.length && total <= limit; i++) {
        total += Math.abs(a[i] - b[i])
    }
    return total
}

const diffColor = [255, 0, 255, 255]
const indicatorWidth = 100

/** Undefined when CI would pass. Otherwise the reference with differing pixels and rows marked. */
export function imageDelta(reference: RGBAImage, actual: RGBAImage, name: string): RGBAImage | undefined {
    const [ref, act] = trimExtraRow(reference, actual)
    if (ref.width === act.width && ref.height === act.height) {
        const total = totalDifferenceUpTo(ref.data, act.data, differenceThreshold)
        if (total <= differenceThreshold) {
            if (total > 0) {
                console.warn(`(${name}) ignoring small total difference: ${total}`)
            }
            return undefined
        }
    }

    const width = Math.max(ref.width, act.width)
    const height = Math.max(ref.height, act.height)
    const outWidth = width + indicatorWidth
    const out = new Uint8Array(outWidth * height * 4)
    let anyDiff = false
    for (let y = 0; y < height; y++) {
        let rowDiff = false
        for (let x = 0; x < width; x++) {
            const o = (y * outWidth + x) * 4
            const r = x < ref.width && y < ref.height ? (y * ref.width + x) * 4 : -1
            const a = x < act.width && y < act.height ? (y * act.width + x) * 4 : -1
            let differs = false
            for (let c = 0; c < 4; c++) {
                const rv = r < 0 ? 0 : ref.data[r + c]
                out[o + c] = rv
                differs ||= rv !== (a < 0 ? 0 : act.data[a + c])
            }
            if (differs) {
                out.set(diffColor, o)
                rowDiff = true
            }
        }
        for (let x = width; x < outWidth; x++) {
            out.set(rowDiff ? diffColor : [0, 0, 0, 255], (y * outWidth + x) * 4)
        }
        anyDiff ||= rowDiff
    }
    return anyDiff ? { width: outWidth, height, data: out } : undefined
}

function commonPrefixLength(a: string[], b: string[], aEnd: number, bEnd: number, step: 1 | -1): number {
    let length = 0
    while (length < aEnd && length < bEnd && a[step === 1 ? length : a.length - 1 - length] === b[step === 1 ? length : b.length - 1 - length]) {
        length++
    }
    return length
}

// Myers' diff is slow to align large dissimilar regions, and the geojson references run to
// over a million lines. Past this, report the shape of the change instead of aligning it.
const diffRegionLimit = 5000
const diffRegionPreview = 20

function splitLines(text: string): string[] {
    const lines = text.split(/\r\n|\r|\n/)
    return lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines
}

/** Undefined when the texts are equal. */
export function textDelta(ref: string, act: string): string | undefined {
    if (ref === act) {
        return undefined
    }
    const refLines = splitLines(ref)
    const actLines = splitLines(act)
    const head = commonPrefixLength(refLines, actLines, refLines.length, actLines.length, 1)
    const tail = commonPrefixLength(refLines, actLines, refLines.length - head, actLines.length - head, -1)
    const refRegion = refLines.slice(head, refLines.length - tail)
    const actRegion = actLines.slice(head, actLines.length - tail)
    const preamble = [
        `reference and actual agree on the first ${head} and last ${tail} lines.`,
        `Line numbers below are relative to line ${head + 1}.`,
        '',
    ]
    if (Math.max(refRegion.length, actRegion.length) > diffRegionLimit) {
        return [
            ...preamble,
            `The differing region is too large to align: ${refRegion.length} reference lines vs ${actRegion.length} actual lines.`,
            '',
            `--- reference (first ${diffRegionPreview} lines of the region)`,
            ...refRegion.slice(0, diffRegionPreview),
            '',
            `+++ actual (first ${diffRegionPreview} lines of the region)`,
            ...actRegion.slice(0, diffRegionPreview),
        ].join('\n')
    }
    const toText = (lines: string[]): string => lines.map(line => `${line}\n`).join('')
    // Drops the leading `=====` separator
    const patch = createTwoFilesPatch('reference', 'actual', toText(refRegion), toText(actRegion), undefined, undefined, { context: 3 })
    return [...preamble, patch.slice(patch.indexOf('\n') + 1, -1)].join('\n')
}
