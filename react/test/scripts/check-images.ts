import { existsSync, readdirSync } from 'fs'
import { copyFile, mkdir, readFile, rm, writeFile } from 'fs/promises'
import path from 'path'

import { decode, encode } from 'fast-png'

import { testCaseNameFromFile } from './screenshot-name'
import { TestCaseName, TestFileId } from './util'

// Ignore images that differ by at most this many total pixel value units, typically from aliasing.
const differenceThreshold = 15

// Screenshots are always 8-bit RGBA; simpler than fast-png's DecodedPng.
interface PngData {
    width: number
    height: number
    data: Uint8Array
}

interface PngPair {
    reference: PngData
    actual: PngData
}

function decodeRgba(buffer: Buffer): PngData {
    const { width, height, data } = decode(buffer)
    return { width, height, data: data as Uint8Array }
}

// Handles the special case where one image has an extra row of pixels at the bottom
// that is identical to the row above it. This causes test flakes but does not reflect
// a meaningful semantic difference in the images.
function specialCaseExtraRowOfPixels(pair: PngPair): PngPair | undefined {
    const { reference, actual } = pair
    if (Math.abs(reference.height - actual.height) !== 1) return
    const minHeight = Math.min(reference.height, actual.height)
    const shorter = reference.height < actual.height ? reference : actual
    const rowBytes = shorter.width * 4
    const lastRow = shorter.data.subarray((minHeight - 1) * rowBytes, minHeight * rowBytes)
    const prevRow = shorter.data.subarray((minHeight - 2) * rowBytes, (minHeight - 1) * rowBytes)
    if (Buffer.compare(lastRow, prevRow) !== 0) return
    const trim = (img: PngData): PngData => ({
        ...img,
        height: minHeight,
        data: img.data.subarray(0, minHeight * img.width * 4),
    })
    return { reference: trim(reference), actual: trim(actual) }
}

// Ignore when images have a very small total difference, typically due to aliasing.
function specialCaseSmallTotalDifference(pair: PngPair, name: string): PngPair | undefined {
    const { reference, actual } = pair
    if (reference.width !== actual.width || reference.height !== actual.height) return
    let total = 0
    for (let i = 0; i < reference.data.length; i++) {
        total += Math.abs(reference.data[i] - actual.data[i])
    }
    if (total > differenceThreshold) return
    if (total > 0) console.warn(`(${name}) ignoring small total difference: ${total}`)
    return { reference, actual: reference }
}

function applySpecialCases(pair: PngPair, name: string): PngPair {
    let result = pair
    result = specialCaseExtraRowOfPixels(result) ?? result
    result = specialCaseSmallTotalDifference(result, name) ?? result
    return result
}

function padToSize(img: PngData, width: number, height: number): PngData {
    if (img.width === width && img.height === height) return img
    const data = new Uint8Array(width * height * 4)
    for (let y = 0; y < img.height; y++) {
        data.set(img.data.subarray(y * img.width * 4, (y + 1) * img.width * 4), y * width * 4)
    }
    return { width, height, data }
}

function setPixel(data: Uint8Array, offset: number, r: number, g: number, b: number, a: number): void {
    data[offset] = r
    data[offset + 1] = g
    data[offset + 2] = b
    data[offset + 3] = a
}

const indicatorWidth = 100

function computeDelta(pairIn: PngPair, name: string): PngData | undefined {
    let { reference, actual } = applySpecialCases(pairIn, name)
    const w = Math.max(reference.width, actual.width)
    const h = Math.max(reference.height, actual.height)
    reference = padToSize(reference, w, h)
    actual = padToSize(actual, w, h)

    // Build delta image: reference pixels on the left, opaque indicator column on the right.
    // Differing pixels and their whole row in the indicator are highlighted magenta.
    const totalWidth = w + indicatorWidth
    const data = new Uint8Array(totalWidth * h * 4)
    for (let y = 0; y < h; y++) {
        data.set(reference.data.subarray(y * w * 4, (y + 1) * w * 4), y * totalWidth * 4)
        for (let x = 0; x < indicatorWidth; x++) {
            data[(y * totalWidth + w + x) * 4 + 3] = 255
        }
    }

    let hasDiff = false
    for (let y = 0; y < h; y++) {
        let rowDiff = false
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4
            if (reference.data[i] !== actual.data[i] || reference.data[i + 1] !== actual.data[i + 1]
                || reference.data[i + 2] !== actual.data[i + 2] || reference.data[i + 3] !== actual.data[i + 3]) {
                setPixel(data, (y * totalWidth + x) * 4, 255, 0, 255, 255)
                rowDiff = true
                hasDiff = true
            }
        }
        if (rowDiff) {
            for (let x = 0; x < indicatorWidth; x++) {
                setPixel(data, (y * totalWidth + w + x) * 4, 255, 0, 255, 255)
            }
        }
    }
    if (hasDiff) {
        return { width: totalWidth, height: h, data }
    }
    return
}

function walkSync(dir: string): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
        entry.isDirectory() ? walkSync(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
    )
}

export async function compareScreenshots(test: TestFileId, testCaseFilter: (testCaseName: TestCaseName) => boolean): Promise<Set<string>> {
    const referenceDir = path.join('..', 'reference_test_screenshots', test)
    const actualDir = path.join('screenshots', test)
    const deltaDir = path.join('delta', test)
    const changedDir = path.join('changed_screenshots', test)

    await rm(deltaDir, { recursive: true, force: true })

    const failing = new Set<string>()

    const isIncluded = (filepath: string): boolean => testCaseFilter(testCaseNameFromFile(filepath))

    await Promise.all([
        // Pass 1: actual files that have no reference counterpart
        ...walkSync(actualDir).filter(isIncluded).map(async (actualFile) => {
            const relative = path.relative(actualDir, actualFile)
            const refFile = path.join(referenceDir, relative)
            if (!existsSync(refFile)) {
                failing.add(testCaseNameFromFile(actualFile))
                console.warn(`Expected reference file ${refFile} not found`)
                const changedFile = path.join(changedDir, relative)
                await mkdir(path.dirname(changedFile), { recursive: true })
                await copyFile(actualFile, changedFile)
            }
        }),

        // Pass 2: compare each reference file against its actual counterpart
        ...walkSync(referenceDir).filter(isIncluded).map(async (refFile) => {
            const relative = path.relative(referenceDir, refFile)
            const actualFile = path.join(actualDir, relative)
            if (!existsSync(actualFile)) {
                failing.add(testCaseNameFromFile(refFile))
                console.warn(`Expected actual file ${actualFile} not found`)
                return
            }
            const [refBuf, actBuf] = await Promise.all([readFile(refFile), readFile(actualFile)])
            const delta = computeDelta(
                { reference: decodeRgba(refBuf), actual: decodeRgba(actBuf) },
                refFile,
            )
            if (delta) {
                failing.add(testCaseNameFromFile(refFile))
                console.warn(`${refFile} and ${actualFile} are different`)
                const deltaFile = path.join(deltaDir, relative)
                const changedFile = path.join(changedDir, relative)
                await mkdir(path.dirname(deltaFile), { recursive: true })
                await writeFile(deltaFile, encode({ ...delta, channels: 4, depth: 8 }))
                await mkdir(path.dirname(changedFile), { recursive: true })
                await copyFile(actualFile, changedFile)
            }
        }),
    ])

    return failing
}
