import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { gunzipSync } from 'zlib'

import { globSync } from 'glob'
import sharp from 'sharp'

import { imageDelta, isImage, isText, RGBAImage, textDelta } from '../../src/dev/snapshotDelta'

/** Compares the test's snapshots against the references, writing deltas and the changed snapshots. Returns whether they all match. */
export async function checkSnapshots(test: string): Promise<boolean> {
    const reference = `../reference_test_snapshots/${test}`
    const actual = `test_snapshots/${test}`
    const delta = `delta/${test}`
    const changed = `changed_snapshots/${test}`

    await fs.rm(delta, { recursive: true, force: true })

    const actualFiles = new Set(globSync('**', { cwd: actual, nodir: true, dot: true }))
    const referenceFiles = new Set(globSync('**', { cwd: reference, nodir: true, dot: true }))

    const copyToChanged = async (file: string): Promise<void> => {
        await fs.mkdir(path.dirname(path.join(changed, file)), { recursive: true })
        await fs.copyFile(path.join(actual, file), path.join(changed, file))
    }

    let errors = 0

    for (const file of actualFiles) {
        if (!referenceFiles.has(file)) {
            errors++
            console.warn(`Expected reference file ${path.join(reference, file)} not found`)
            await copyToChanged(file)
        }
    }

    const toCompare: string[] = []
    for (const file of referenceFiles) {
        if (!actualFiles.has(file)) {
            errors++
            console.warn(`Expected actual file ${path.join(actual, file)} not found`)
        }
        else {
            toCompare.push(file)
        }
    }

    // sharp decodes on its own threads, so comparing several at once uses them
    await Promise.all(Array.from({ length: os.availableParallelism() }, async () => {
        for (let file; (file = toCompare.pop()) !== undefined;) {
            const [ref, act] = await Promise.all([reference, actual].map(dir => fs.readFile(path.join(dir, file))))
            if (ref.equals(act)) {
                continue
            }
            if (await writeDelta(file, ref, act, path.join(delta, file), path.join(reference, file))) {
                errors++
                console.warn(`${path.join(reference, file)} and ${path.join(actual, file)} are different`)
                await copyToChanged(file)
            }
        }
    }))

    if (errors > 0) {
        console.warn(`${errors} errors found`)
        return false
    }
    console.warn('All tests passed')
    return true
}

/** Returns whether there was a difference to write. */
async function writeDelta(file: string, ref: Buffer, act: Buffer, deltaPath: string, name: string): Promise<boolean> {
    if (isImage(file)) {
        const [refImage, actImage] = await Promise.all([decodePng(ref), decodePng(act)])
        const delta = imageDelta(refImage, actImage, name)
        if (delta === undefined) {
            return false
        }
        await fs.mkdir(path.dirname(deltaPath), { recursive: true })
        await sharp(delta.data, { raw: { width: delta.width, height: delta.height, channels: 4 } }).png().toFile(deltaPath)
        return true
    }
    if (isText(file)) {
        const decode = (buffer: Buffer): string => (file.endsWith('.gz') ? gunzipSync(buffer) : buffer).toString('utf-8')
        const delta = textDelta(decode(ref), decode(act))
        if (delta === undefined) {
            return false
        }
        await fs.mkdir(path.dirname(deltaPath), { recursive: true })
        await fs.writeFile(`${deltaPath}.diff`, `${delta}\n`)
        return true
    }
    throw new Error(`No comparator for ${file}`)
}

async function decodePng(buffer: Buffer): Promise<RGBAImage> {
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    if (info.channels !== 4) {
        throw new Error(`Expected 4 channels after decoding, got ${info.channels}`)
    }
    return { width: info.width, height: info.height, data }
}
