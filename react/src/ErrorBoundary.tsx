import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react'
import type { RawSourceMap } from 'source-map-js'

import { ErrorBox } from './ErrorBox'
import { Navigator } from './navigation/Navigator'
import { Version } from './page_template/template'

export class ErrorBoundary extends Component<{ children: ReactNode }, { caught?: { error: unknown } }> {
    override state: { caught?: { error: unknown } } = {}

    static getDerivedStateFromError(error: unknown): { caught: { error: unknown } } {
        return { caught: { error } }
    }

    override componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
        Navigator.crashed = true
        console.error(error, errorInfo.componentStack)
    }

    override render(): ReactNode {
        if (this.state.caught === undefined) {
            return this.props.children
        }
        return <UncaughtErrorScreen error={this.state.caught.error} />
    }
}

/** Locations in the compiled bundle, as they appear in a stack trace */
const bundleLocation = /(https?:\/\/[^\s)]+\.js):(\d+):(\d+)/

async function symbolicate(stack: string): Promise<string> {
    const { SourceMapConsumer } = await import('source-map-js')
    const consumers = new Map<string, Promise<InstanceType<typeof SourceMapConsumer>>>()
    const lines = await Promise.all(stack.split('\n').map(async (line) => {
        const match = bundleLocation.exec(line)
        if (match === null) {
            return line
        }
        const [location, bundle, lineNumber, column] = match
        if (!consumers.has(bundle)) {
            consumers.set(bundle, fetch(`${bundle}.map`)
                .then(async response => new SourceMapConsumer(await response.json() as RawSourceMap)))
        }
        // The fields are null when the position isn't in the map, which the types don't reflect
        const original: { source: string | null, line: number | null, column: number | null }
            // Stack trace columns are 1-based, source map ones are 0-based
            = (await consumers.get(bundle)!).originalPositionFor({ line: parseInt(lineNumber), column: parseInt(column) - 1 })
        if (original.source === null) {
            return line
        }
        // Sources are named like webpack://assets/src/index.tsx
        return line.replaceAll(location, `${original.source.replaceAll(/^webpack:\/\/[^/]*\//g, '')}:${original.line}:${original.column}`)
    }))
    return lines.join('\n')
}

function UncaughtErrorScreen({ error }: { error: unknown }): ReactNode {
    const rawStack = error instanceof Error ? (error.stack ?? `${error.name}: ${error.message}`) : String(error)
    const [stack, setStack] = useState(rawStack)

    useEffect(() => {
        void symbolicate(rawStack).then(setStack, (symbolicationError: unknown) => {
            console.error('Could not symbolicate stack', symbolicationError)
        })
    }, [rawStack])

    return (
        <ErrorBox topPanel={false} hideSidebar={true}>
            <div data-test-id="uncaughtError">
                <h1>
                    Something Went Wrong
                </h1>
                <p>
                    Urban Stats Version
                    {' '}
                    <Version />
                    {' '}
                    crashed while displaying the page at
                    <br />
                    <code>{location.href}</code>
                </p>
                <pre style={{ textAlign: 'left', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                    {stack}
                </pre>
                <p>
                    Please report this by
                    {' '}
                    <a href="https://github.com/kavigupta/urbanstats/issues">filing an issue on GitHub</a>
                    , including steps to reproduce, the URL, version number, and the message above.
                </p>
                <p>
                    <button onClick={() => {
                        // eslint-disable-next-line no-restricted-syntax -- This is the error boundary
                        location.reload()
                    }}
                    >
                        Reload the Page
                    </button>
                </p>
            </div>
        </ErrorBox>
    )
}
