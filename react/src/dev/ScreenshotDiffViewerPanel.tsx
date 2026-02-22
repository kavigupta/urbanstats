import { Data64URIWriter, FileEntry, Reader, ZipReader } from '@zip.js/zip.js'
import React, { ReactNode, useContext, useEffect, useMemo } from 'react'
import { z } from 'zod'

import { Navigator } from '../navigation/Navigator'
import { LongLoad } from '../navigation/loading'
import { DefaultMap } from '../utils/DefaultMap'
import { useOrderedResolve } from '../utils/useOrderedResolve'

export function ScreenshotDiffViewerPanel({ hash, artifactId, index }: { hash: string, artifactId: string, index: number }): ReactNode {
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
`}
            </style>
            <LazyNode node={entriesPromise.then(entries => <Entires hash={hash} entries={entries} index={index} artifactId={artifactId} />)} />
        </>
    )
}

function Entires({ hash, entries, index, artifactId }: { hash: string, entries: FileEntry[], index: number, artifactId: string }): ReactNode {
    const changed = useMemo(() => entries
        .map(entry => ({ entry, match: /changed_screenshots\/([^\/]+)\/[^\/]+\/(.+)\.png$/.exec(entry.filename) }))
        .filter((item): item is { entry: FileEntry, match: RegExpExecArray } => item.match !== null)
        .sort((a, b) => a.entry.filename.localeCompare(b.entry.filename))
        .map(({ entry, match: [, test, file] }) => {
            const delta = entries.find(e => e.filename === deltaPath(test, file))
            return {
                changed: imageFromEntry(entry),
                delta: delta ? imageFromEntry(delta) : undefined,
                test,
                file,
            }
        }), [entries])

    const navigator = useContext(Navigator.Context)

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'ArrowLeft') {
                if (index > 0) {
                    void navigator.navigate({ kind: 'screenshotDiffViewer', hash, artifactId, index: index - 1 }, { history: 'replace', scroll: { kind: 'position', top: 0 } })
                }
            }
            else if (event.key === 'ArrowRight') {
                if (index < changed.length - 1) {
                    void navigator.navigate({ kind: 'screenshotDiffViewer', hash, artifactId, index: index + 1 }, { history: 'replace', scroll: { kind: 'position', top: 0 } })
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => { window.removeEventListener('keydown', handleKeyDown) }
    }, [changed.length, navigator, artifactId, hash, index])

    useEffect(() => {
        const range = 2
        changed.slice(Math.max(0, index - range), Math.min(changed.length, index + range + 1)).forEach((item) => {
            item.changed.load()
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

function Diff({ test, file, hash, delta, changed, index, total, navigator, artifactId }: { test: string, file: string, hash: string, changed: Delayed, delta?: Delayed, index: number, total: number, navigator: Navigator, artifactId: string }): ReactNode {
    const canGoBack = index > 0
    const canGoForward = index < total - 1

    const handleBack = (): void => {
        if (canGoBack) {
            void navigator.navigate({ kind: 'screenshotDiffViewer', hash, artifactId, index: index - 1 }, { history: 'replace', scroll: { kind: 'position', top: 0 } })
        }
    }

    const handleForward = (): void => {
        if (canGoForward) {
            void navigator.navigate({ kind: 'screenshotDiffViewer', hash, artifactId, index: index + 1 }, { history: 'replace', scroll: { kind: 'position', top: 0 } })
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
                                    <img src={githubImageUrl(hash, test, file)} />
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
                <div>
                    <LazyNode node={changed.get} />
                </div>
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

function getPAT(): string {
    let result = localStorage.getItem('github-personal-access-token')
    while (result === null) {
        result = prompt('Github Personal Access Token')
    }
    localStorage.setItem('github-personal-access-token', result)
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
        const head = await fetch(`https://api.github.com/repos/kavigupta/urbanstats/actions/artifacts/${this.artifactId}/zip`, {
            method: 'HEAD',
            headers: {
                Authorization: `Bearer ${getPAT()}`,
            },
        })
        this.size = z.coerce.number().parse(head.headers.get('Content-Length'))
        this.url = head.url
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

function deltaPath(test: string, file: string): string {
    return `delta/${test}/Chrome/${file}.png`
}

function githubImageUrl(hash: string, test: string, file: string): string {
    return encodeURI(`https://raw.githubusercontent.com/kavigupta/urbanstats/${hash}/reference_test_screenshots/${test}/Chrome/${file}.png`)
}

interface Delayed { load: () => void, get: Promise<ReactNode> }

function imageFromEntry(entry: FileEntry): Delayed {
    let resolve: () => void
    return {
        load: () => {
            resolve()
        },
        get: (async () => {
            await new Promise<void>((r) => {
                resolve = r
            })
            const writer = new Data64URIWriter('image/png')
            await entry.getData(writer)
            const imageStr = await writer.getData()
            return <img src={imageStr} />
        })(),
    }
}
