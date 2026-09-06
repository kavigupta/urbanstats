import { Data64URIWriter, FileEntry, Reader, TextWriter, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js'
import React, { ReactNode, useContext, useEffect, useMemo } from 'react'
import { z } from 'zod'

import { Navigator } from '../navigation/Navigator'
import { LongLoad } from '../navigation/loading'
import { DefaultMap } from '../utils/DefaultMap'
import { useOrderedResolve } from '../utils/useOrderedResolve'

export function AssetDiffViewerPanel({ hash, artifactId, index }: { hash: string, artifactId: string, index: number }): ReactNode {
    const entriesPromise = useMemo(async () => {
        const allEntries = await (zipReader(artifactId)).getEntries()
        const fileEntries = allEntries.filter(e => !e.directory)
        return fileEntries
    }, [artifactId])

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
            <LazyNode node={entriesPromise.then(entries => <Entries hash={hash} entries={entries} index={index} artifactId={artifactId} />)} />
        </>
    )
}

function Entries({ hash, entries, index, artifactId }: { hash: string, entries: FileEntry[], index: number, artifactId: string }): ReactNode {
    const changed = useMemo(() => entries
        .map(entry => ({ entry, match: /changed_assets\/([^\/]+)\/([^\/]+)\/(.+)$/.exec(entry.filename) }))
        .filter((item): item is { entry: FileEntry, match: RegExpExecArray } => item.match !== null)
        .sort((a, b) => a.entry.filename.localeCompare(b.entry.filename))
        .map(({ entry, match: [, test, browser, file] }) => {
            const delta = entries.find(e => e.filename === `delta/${test}/${browser}/${deltaName(file)}`)
            return {
                // A changed text asset says nothing its diff doesn't, and can run to tens of megabytes
                changed: isImage(file) || delta === undefined ? nodeFromEntry(entry) : undefined,
                delta: delta ? nodeFromEntry(delta) : undefined,
                test,
                browser,
                file,
            }
        }), [entries])

    const navigator = useContext(Navigator.Context)

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'ArrowLeft') {
                if (index > 0) {
                    void navigator.navigate({ kind: 'assetDiffViewer', hash, artifactId, index: index - 1 }, { history: 'replace', scroll: { kind: 'position', top: 0 } })
                }
            }
            else if (event.key === 'ArrowRight') {
                if (index < changed.length - 1) {
                    void navigator.navigate({ kind: 'assetDiffViewer', hash, artifactId, index: index + 1 }, { history: 'replace', scroll: { kind: 'position', top: 0 } })
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => { window.removeEventListener('keydown', handleKeyDown) }
    }, [changed.length, navigator, artifactId, hash, index])

    useEffect(() => {
        const range = 2
        changed.slice(Math.max(0, index - range), Math.min(changed.length, index + range + 1)).forEach((item) => {
            item.changed?.load()
            item.delta?.load()
        })
    }, [changed, index])

    if (changed.length === 0) {
        return (
            <div>
                <h1>
                    No Entries
                </h1>
            </div>
        )
    }

    if (index >= changed.length || index < 0) {
        return (
            <div>
                <h1>
                    Out of Range
                </h1>
            </div>
        )
    }

    return <Diff {...changed[index]} hash={hash} index={index} total={changed.length} navigator={navigator} artifactId={artifactId} />
}

function Diff({ test, browser, file, hash, delta, changed, index, total, navigator, artifactId }: { test: string, browser: string, file: string, hash: string, changed?: Delayed, delta?: Delayed, index: number, total: number, navigator: Navigator, artifactId: string }): ReactNode {
    const canGoBack = index > 0
    const canGoForward = index < total - 1

    const handleBack = (): void => {
        if (canGoBack) {
            void navigator.navigate({ kind: 'assetDiffViewer', hash, artifactId, index: index - 1 }, { history: 'replace', scroll: { kind: 'position', top: 0 } })
        }
    }

    const handleForward = (): void => {
        if (canGoForward) {
            void navigator.navigate({ kind: 'assetDiffViewer', hash, artifactId, index: index + 1 }, { history: 'replace', scroll: { kind: 'position', top: 0 } })
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
                                        ? <img src={referenceUrl(hash, test, browser, file)} />
                                        : <a href={referenceUrl(hash, test, browser, file)}>Reference</a>}
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

function referenceUrl(hash: string, test: string, browser: string, file: string): string {
    return encodeURI(`https://raw.githubusercontent.com/kavigupta/urbanstats/${hash}/reference_test_assets/${test}/${browser}/${file}`)
}

interface Delayed { load: () => void, get: Promise<ReactNode> }

function nodeFromEntry(entry: FileEntry): Delayed {
    let resolve: () => void
    return {
        load: () => {
            resolve()
        },
        get: (async () => {
            await new Promise<void>((r) => {
                resolve = r
            })
            if (isImage(entry.filename)) {
                const writer = new Data64URIWriter('image/png')
                await entry.getData(writer)
                return <img src={await writer.getData()} />
            }
            return textNode(await textFromEntry(entry), entry.filename.endsWith('.diff'))
        })(),
    }
}

async function textFromEntry(entry: FileEntry): Promise<string> {
    if (entry.filename.endsWith('.gz')) {
        const writer = new Uint8ArrayWriter()
        await entry.getData(writer)
        const decompressed = new Blob([await writer.getData()]).stream().pipeThrough(new DecompressionStream('gzip'))
        return await new Response(decompressed).text()
    }
    const writer = new TextWriter()
    await entry.getData(writer)
    return await writer.getData()
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
