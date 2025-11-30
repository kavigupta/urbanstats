import { Data64URIWriter, FileEntry, HttpRangeReader, ZipReader } from '@zip.js/zip.js'
import React, { ReactNode, useEffect, useMemo, useState } from 'react'

import { LongLoad } from '../navigation/loading'
import { useOrderedResolve } from '../utils/useOrderedResolve'

export function ScreenshotDiffViewerPanel({ hash, artifactId }: { hash: string, artifactId: string }): ReactNode {
    const entriesPromise = useMemo(async () => {
        const allEntries = await (await zipReader(artifactId)).getEntries()
        const fileEntries = allEntries.filter(e => !e.directory)
        return <Entires hash={hash} entries={fileEntries} />
    }, [artifactId, hash])

    return (
        <>
            <style>
                {`img {
      max-width: 100%;
    }`}
            </style>
            <LazyNode node={entriesPromise} />
        </>
    )
}

function Entires({ hash, entries }: { hash: string, entries: FileEntry[] }): ReactNode {
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

    const [index, setIndex] = useState(0)

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'ArrowLeft') {
                setIndex(prev => Math.max(0, prev - 1))
            }
            else if (event.key === 'ArrowRight') {
                setIndex(prev => Math.min(changed.length - 1, prev + 1))
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => { window.removeEventListener('keydown', handleKeyDown) }
    }, [changed.length])

    useEffect(() => {
        if (index >= changed.length) {
            setIndex(changed.length - 1)
        }
    }, [index, changed])

    useEffect(() => {
        const range = 1
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

    return <Diff {...changed[index]} hash={hash} />
}

function Diff({ test, file, hash, delta, changed }: { test: string, file: string, hash: string, changed: Delayed, delta?: Delayed }): ReactNode {
    return (
        <>
            <div>
                <h2>
                    {test}
                </h2>
            </div>
            <div>
                <h3>
                    {file}
                </h3>
            </div>
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
        </>
    )
}

function LazyNode({ node }: { node: Promise<ReactNode> }): ReactNode {
    const { result, loading } = useOrderedResolve(node)

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

async function zipReader(artifactId: string): Promise< ZipReader<unknown>> {
    const head = await fetch(`https://api.github.com/repos/kavigupta/urbanstats/actions/artifacts/${artifactId}/zip`, { method: 'HEAD',
        headers: {
            Authorization: `Bearer ${getPAT()}`,
        },
    })
    const rangeReader = new HttpRangeReader(head.url)
    return new ZipReader(rangeReader)
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
