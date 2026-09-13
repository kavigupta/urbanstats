import { Data64URIWriter, FileEntry, Reader, TextWriter, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js'
import React, { ReactNode, useContext, useEffect, useMemo } from 'react'
import { z } from 'zod'

import { Navigator } from '../navigation/Navigator'
import { LongLoad } from '../navigation/loading'
import { DefaultMap } from '../utils/DefaultMap'
import { useOrderedResolve } from '../utils/useOrderedResolve'

/** Which run's assets to show, and which tests of it. Everything but the index the viewer navigates within. */
interface Source { artifactId?: string, hash?: string, tests?: string }

interface Item {
    test: string
    browser: string
    file: string
    referenceUrl: string
    changed?: Delayed
    delta?: Delayed
}

export function AssetDiffViewerPanel({ hash, artifactId, tests, index }: Source & { index: number }): ReactNode {
    const source = useMemo(() => ({ artifactId, hash, tests }), [artifactId, hash, tests])
    const items = useMemo(
        () => artifactId === undefined || hash === undefined
            ? localItems(splitTests(tests))
            : artifactItems(artifactId, hash, splitTests(tests)),
        [artifactId, hash, tests],
    )

    return (
        <>
            <style>
                {`
.navigation-buttons {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    align-items: center;
}

.navigation-buttons button {
    padding: 8px 16px;
    font-size: 16px;
    cursor: pointer;
    border: 1px solid #ccc;
    background-color: #f5f5f5;
    border-radius: 4px;
}

.navigation-buttons button:hover:not(:disabled) {
    background-color: #e0e0e0;
}

.navigation-buttons button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.wrapper {
    container-type: size;
    inset: 0;
    position: absolute;
}

.container {
    display: flex;
    gap: 10px;
}

@container (aspect-ratio < 1) {
    .container {
        flex-direction: column;
    }

    img {
        max-height: 30vh;
        max-width: 90vw;
    }
}

@container (aspect-ratio >= 1) {
    .container {
        flex-direction: row;
    }

    img {
        max-width: 30vw;
        max-height: 90vh;
    }
}

pre.asset-text {
    margin: 0;
    overflow: auto;
    max-height: 80vh;
}

.diff-added { color: green; }
.diff-removed { color: red; }
.diff-hunk { color: blue; }
`}
            </style>
            <LazyNode node={items.then(loaded => <Entries items={loaded} index={index} source={source} />)} />
        </>
    )
}

function splitTests(tests: string | undefined): string[] | undefined {
    return tests === undefined ? undefined : tests.split(',').filter(test => test !== '')
}

async function artifactItems(artifactId: string, hash: string, tests: string[] | undefined): Promise<Item[]> {
    const entries = (await (zipReader(artifactId)).getEntries()).filter(e => !e.directory)
    return entries
        .map(entry => ({ entry, match: /changed_assets\/([^\/]+)\/([^\/]+)\/(.+)$/.exec(entry.filename) }))
        .filter((item): item is { entry: FileEntry, match: RegExpExecArray } => item.match !== null)
        .filter(({ match: [, test] }) => tests === undefined || tests.includes(test))
        .sort((a, b) => a.entry.filename.localeCompare(b.entry.filename))
        .map(({ entry, match: [, test, browser, file] }) => {
            const delta = entries.find(e => e.filename === `delta/${test}/${browser}/${deltaName(file)}`)
            return {
                test,
                browser,
                file,
                referenceUrl: encodeURI(`https://raw.githubusercontent.com/kavigupta/urbanstats/${hash}/reference_test_assets/${test}/${browser}/${file}`),
                changed: showChanged(file, delta !== undefined) ? nodeFromEntry(entry) : undefined,
                delta: delta === undefined ? undefined : nodeFromEntry(delta),
            }
        })
}

const manifestSchema = z.object({ changed: z.array(z.string()), delta: z.array(z.string()) })

/**
 * What `writeChangedAssetsManifest` recorded of a local run, served by the dev server under
 * /local-assets. A test whose manifest is missing changed nothing.
 */
async function localItems(tests: string[] | undefined): Promise<Item[]> {
    if (tests === undefined) {
        return []
    }
    const perTest = await Promise.all(tests.map(async (test) => {
        const response = await fetch(localUrl('changed', test, 'manifest.json'))
        if (!response.ok) {
            return []
        }
        const { changed, delta } = manifestSchema.parse(await response.json())
        return changed.sort((a, b) => a.localeCompare(b)).map((path): Item => {
            const [browser, ...rest] = path.split('/')
            const file = rest.join('/')
            const hasDelta = delta.includes(`${browser}/${deltaName(file)}`)
            return {
                test,
                browser,
                file,
                referenceUrl: localUrl('reference', test, path),
                changed: showChanged(file, hasDelta) ? nodeFromUrl(localUrl('changed', test, path), file) : undefined,
                delta: hasDelta ? nodeFromUrl(localUrl('delta', test, `${browser}/${deltaName(file)}`), deltaName(file)) : undefined,
            }
        })
    }))
    return perTest.flat()
}

function localUrl(tree: 'reference' | 'changed' | 'delta', test: string, path: string): string {
    return encodeURI(`/local-assets/${tree}/${test}/${path}`)
}

// A changed text asset says nothing its diff doesn't, and can run to tens of megabytes
function showChanged(file: string, hasDelta: boolean): boolean {
    return isImage(file) || !hasDelta
}

function Entries({ items, index, source }: { items: Item[], index: number, source: Source }): ReactNode {
    const navigator = useContext(Navigator.Context)

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'ArrowLeft') {
                if (index > 0) {
                    void navigator.navigate({ kind: 'assetDiffViewer', ...source, index: index - 1 }, { history: 'replace', scroll: { kind: 'position', top: 0 } })
                }
            }
            else if (event.key === 'ArrowRight') {
                if (index < items.length - 1) {
                    void navigator.navigate({ kind: 'assetDiffViewer', ...source, index: index + 1 }, { history: 'replace', scroll: { kind: 'position', top: 0 } })
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => { window.removeEventListener('keydown', handleKeyDown) }
    }, [items.length, navigator, source, index])

    useEffect(() => {
        const range = 2
        items.slice(Math.max(0, index - range), Math.min(items.length, index + range + 1)).forEach((item) => {
            item.changed?.load()
            item.delta?.load()
        })
    }, [items, index])

    if (items.length === 0) {
        return (
            <div>
                <h1>
                    No Entries
                </h1>
            </div>
        )
    }

    if (index >= items.length || index < 0) {
        return (
            <div>
                <h1>
                    Out of Range
                </h1>
            </div>
        )
    }

    return <Diff {...items[index]} source={source} index={index} total={items.length} navigator={navigator} />
}

function Diff({ test, file, referenceUrl, delta, changed, index, total, navigator, source }: Item & { index: number, total: number, navigator: Navigator, source: Source }): ReactNode {
    const canGoBack = index > 0
    const canGoForward = index < total - 1

    const handleBack = (): void => {
        if (canGoBack) {
            void navigator.navigate({ kind: 'assetDiffViewer', ...source, index: index - 1 }, { history: 'replace', scroll: { kind: 'position', top: 0 } })
        }
    }

    const handleForward = (): void => {
        if (canGoForward) {
            void navigator.navigate({ kind: 'assetDiffViewer', ...source, index: index + 1 }, { history: 'replace', scroll: { kind: 'position', top: 0 } })
        }
    }

    return (
        <div className="wrapper">
            <div className="navigation-buttons">
                <button onClick={handleBack} disabled={!canGoBack}>
                    ← Back
                </button>
                <h2 style={{ margin: 0 }}>
                    (
                    {index + 1}
                    {' '}
                    /
                    {' '}
                    {total}
                    )
                    {' '}
                    {test}
                    {' '}
                    /
                    {' '}
                    {file}
                </h2>
                <button onClick={handleForward} disabled={!canGoForward}>
                    Forward →
                </button>
            </div>
            <div className="container">
                {delta
                    ? (
                            <>
                                <div>
                                    {isImage(file)
                                        ? <img src={referenceUrl} />
                                        : <a href={referenceUrl}>Reference</a>}
                                </div>
                                <div>
                                    <LazyNode node={delta.get} />
                                </div>
                            </>
                        )
                    : (
                            <div>
                                <h1>
                                    New File
                                </h1>
                            </div>
                        )}
                {changed
                    ? (
                            <div>
                                <LazyNode node={changed.get} />
                            </div>
                        )
                    : undefined}
            </div>
        </div>
    )
}

function LazyNode({ node }: { node: Promise<ReactNode> }): ReactNode {
    const { result, loading } = useOrderedResolve(node, 'LazyNode')

    if (result === undefined || loading) {
        return <LongLoad />
    }
    else {
        return result
    }
}

const patKey = 'github-personal-access-token'

function getPAT(): string {
    let result = localStorage.getItem(patKey)
    while (result === null) {
        result = prompt('Github Personal Access Token')
    }
    localStorage.setItem(patKey, result)
    return result
}

function zipReader(artifactId: string): ZipReader<unknown> {
    return new ZipReader(new CustomReader(artifactId))
}

class CustomReader extends Reader<void> {
    constructor(readonly artifactId: string) {
        super()
    }

    override size = 0
    url = ''

    blockSize = 1_000_000

    override async init(): Promise<void> {
        await super.init?.()
        while (true) {
            const head = await fetch(`https://api.github.com/repos/kavigupta/urbanstats/actions/artifacts/${this.artifactId}/zip`, {
                method: 'HEAD',
                headers: {
                    Authorization: `Bearer ${getPAT()}`,
                },
            })

            if (head.status !== 200) {
                if (confirm(`${head.status} Accessing Github. Likely a problem with the access token. Cancel to retry, OK to clear token and prompt for a new one`)) {
                    localStorage.removeItem(patKey)
                }
                continue
            }

            this.size = z.coerce.number().parse(head.headers.get('Content-Length'))
            this.url = head.url
            break
        }
    }

    blocks = new DefaultMap<number, Promise<Uint8Array>>(async (blockIndex) => {
        const start = blockIndex * this.blockSize
        const end = Math.min(start + this.blockSize - 1, this.size - 1)
        const response = await fetch(this.url, {
            headers: {
                Range: `bytes=${start}-${end}`,
            },
        })
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        return new Uint8Array(await response.arrayBuffer())
    })

    override async readUint8Array(index: number, length: number): Promise<Uint8Array> {
        const result = new Uint8Array(length)
        let resultOffset = 0

        while (resultOffset < length) {
            const currentIndex = index + resultOffset
            const blockIndex = Math.floor(currentIndex / this.blockSize)
            const blockOffset = currentIndex % this.blockSize

            const block = await this.blocks.get(blockIndex)
            const bytesToCopy = Math.min(length - resultOffset, this.blockSize - blockOffset, block.length - blockOffset)

            result.set(block.slice(blockOffset, blockOffset + bytesToCopy), resultOffset)
            resultOffset += bytesToCopy
        }

        return result
    }
}

function isImage(file: string): boolean {
    return file.endsWith('.png')
}

function deltaName(file: string): string {
    return isImage(file) ? file : `${file}.diff`
}

interface Delayed { load: () => void, get: Promise<ReactNode> }

function delayed(render: () => Promise<ReactNode>): Delayed {
    let resolve: () => void
    return {
        load: () => {
            resolve()
        },
        get: (async () => {
            await new Promise<void>((r) => {
                resolve = r
            })
            return await render()
        })(),
    }
}

function nodeFromEntry(entry: FileEntry): Delayed {
    return delayed(async () => {
        if (isImage(entry.filename)) {
            const writer = new Data64URIWriter('image/png')
            await entry.getData(writer)
            return <img src={await writer.getData()} />
        }
        return textNode(await textFromEntry(entry), entry.filename.endsWith('.diff'))
    })
}

function nodeFromUrl(url: string, file: string): Delayed {
    return delayed(async () => {
        if (isImage(file)) {
            return <img src={url} />
        }
        const response = await fetch(url)
        return textNode(await decompress(await response.blob(), file), file.endsWith('.diff'))
    })
}

async function textFromEntry(entry: FileEntry): Promise<string> {
    if (entry.filename.endsWith('.gz')) {
        const writer = new Uint8ArrayWriter()
        await entry.getData(writer)
        return await decompress(new Blob([await writer.getData()]), entry.filename)
    }
    const writer = new TextWriter()
    await entry.getData(writer)
    return await writer.getData()
}

async function decompress(blob: Blob, file: string): Promise<string> {
    if (!file.endsWith('.gz')) {
        return await blob.text()
    }
    return await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text()
}

const maxTextLines = 1000

function textNode(text: string, colorize: boolean): ReactNode {
    const lines = text.split('\n')
    const shown = lines.slice(0, maxTextLines)
    return (
        <pre className="asset-text">
            {shown.map((line, lineNumber) => (
                <div key={lineNumber} className={colorize ? diffLineClass(line) : undefined}>
                    {line === '' ? ' ' : line}
                </div>
            ))}
            {lines.length > shown.length ? <div>{`... ${lines.length - shown.length} more lines`}</div> : undefined}
        </pre>
    )
}

function diffLineClass(line: string): string | undefined {
    switch (line[0]) {
        case '+':
            return 'diff-added'
        case '-':
            return 'diff-removed'
        case '@':
            return 'diff-hunk'
        default:
            return undefined
    }
}
