import React, { ReactNode, useEffect, useRef, useState } from 'react'

import { useColors } from '../page_template/colors'

/**
 * What a crawler gets back for a page: the tags the Worker rewrote on the way through.
 */
interface Embed {
    title: string
    description: string
    image: string
}

type Status =
    { kind: 'loading' }
    | { kind: 'ready', embed: Embed }
    | { kind: 'down' }
    | { kind: 'notEmbeddable' }

async function fetchEmbed(workerOrigin: string, target: string): Promise<Status> {
    let html: string
    try {
        const response = await fetch(new URL(target, workerOrigin), { headers: { accept: 'text/html' }, cache: 'no-store' })
        if (!response.ok) {
            return { kind: 'down' }
        }
        html = await response.text()
    }
    catch {
        // A dead port and a blocked cross-origin read are indistinguishable here, and both mean the
        // same thing to whoever is looking at this: start the Worker.
        return { kind: 'down' }
    }

    const parsed = new DOMParser().parseFromString(html, 'text/html')
    const meta = (property: string): string | undefined =>
        parsed.querySelector(`meta[property="${property}"]`)?.getAttribute('content') ?? undefined

    const image = meta('og:image')
    const title = meta('og:title')
    if (image === undefined || title === undefined) {
        return { kind: 'down' }
    }
    const imageURL = new URL(image, workerOrigin)
    // The static preview means the Worker looked at this page and had nothing per-URL to say.
    if (imageURL.pathname === '/link-preview.png') {
        return { kind: 'notEmbeddable' }
    }
    // The card is served with a day of cache-control, under a URL that stays the same while the code
    // drawing it changes, so the preview asks for a render of the code as it is now.
    imageURL.searchParams.set('__preview', Date.now().toString())
    return {
        kind: 'ready',
        embed: {
            title,
            description: meta('og:description') ?? '',
            image: imageURL.toString(),
        },
    }
}

export function EmbedPreviewPanel({ target, ogPort }: { target: string, ogPort: number }): ReactNode {
    const colors = useColors()
    const workerOrigin = `http://localhost:${ogPort}`

    const [path, setPath] = useState(target)
    // Separate from `path` so that following the frame does not reload the frame, which would undo
    // whatever navigation we just followed. Only committing the input reloads it.
    const [src, setSrc] = useState(target)
    const [status, setStatus] = useState<Status>({ kind: 'loading' })
    const [attempt, setAttempt] = useState(0)

    const frame = useRef<HTMLIFrameElement>(null)
    const seen = useRef(target)
    const isolate = useRef<string | undefined>(undefined)

    /*
     * The site navigates with pushState, which fires no load event on the frame, so watching is the
     * only way to follow it. Reading the location is allowed because the frame is same-origin.
     *
     * Compared against the last location we saw rather than against `path`, so that typing in the
     * input is never overwritten by a poll that found nothing new.
     */
    useEffect(() => {
        const interval = setInterval(() => {
            let here
            try {
                const location = frame.current?.contentWindow?.location
                if (location === undefined || location.href === 'about:blank') {
                    return
                }
                here = location.pathname + location.search + location.hash
            }
            catch {
                return // navigated off-origin, which is not something we can preview anyway
            }
            if (here !== seen.current) {
                seen.current = here
                setPath(here)
            }
        }, 250)
        return () => { clearInterval(interval) }
    }, [])

    /*
     * Editing the Worker restarts it, and the site's own hot reload never hears about that, so the
     * card would sit there drawn by code that no longer exists. The first id seen is only recorded:
     * a reload is a change from one id to another.
     */
    useEffect(() => {
        const interval = setInterval(() => {
            void fetch(new URL('/__reload', workerOrigin), { cache: 'no-store' })
                .then(response => response.text())
                .then((id) => {
                    if (isolate.current !== undefined && id !== isolate.current) {
                        setAttempt(a => a + 1)
                    }
                    isolate.current = id
                })
                .catch(() => undefined)
        }, 1000)
        return () => { clearInterval(interval) }
    }, [workerOrigin])

    useEffect(() => {
        let current = true
        setStatus({ kind: 'loading' })
        void fetchEmbed(workerOrigin, path).then((result) => {
            if (current) {
                setStatus(result)
            }
        })
        return () => { current = false }
    }, [workerOrigin, path, attempt])

    const panel = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' as const, gap: '8px' }
    const heading = { fontSize: '13px', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: colors.ordinalTextColor }

    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', backgroundColor: colors.background, color: colors.textMain }}>
            <input
                value={path}
                onChange={(e) => { setPath(e.target.value) }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        seen.current = path
                        setSrc(path)
                    }
                }}
                style={{ padding: '8px', fontSize: '14px', fontFamily: 'monospace', backgroundColor: colors.slightlyDifferentBackground, color: colors.textMain, border: `1px solid ${colors.borderNonShadow}`, borderRadius: '4px' }}
            />
            <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: '12px' }}>
                <div style={panel}>
                    <div style={heading}>Page</div>
                    <iframe
                        ref={frame}
                        src={src}
                        title="site"
                        style={{ flex: 1, width: '100%', border: `1px solid ${colors.borderNonShadow}`, borderRadius: '4px', backgroundColor: colors.background }}
                    />
                </div>
                <div style={panel}>
                    <div style={heading}>{`Embed — ${workerOrigin}`}</div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {status.kind === 'loading' ? <div>Loading…</div> : null}
                        {status.kind === 'ready' ? <Card embed={status.embed} /> : null}
                        {status.kind === 'notEmbeddable' ? <div>This page keeps the static preview — the Worker only draws articles.</div> : null}
                        {status.kind === 'down' ? <WorkerDown onRetry={() => { setAttempt(a => a + 1) }} /> : null}
                    </div>
                </div>
            </div>
        </div>
    )
}

/** Roughly how a large-image link unfurl looks, so the card can be judged at the size it ships at. */
function Card({ embed }: { embed: Embed }): ReactNode {
    const colors = useColors()
    return (
        <div data-test-id="embed-card" style={{ maxWidth: '520px', border: `1px solid ${colors.borderNonShadow}`, borderRadius: '8px', overflow: 'hidden', backgroundColor: colors.slightlyDifferentBackground }}>
            <img src={embed.image} alt="" style={{ display: 'block', width: '100%', aspectRatio: '1200 / 630' }} />
            <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: '13px', color: colors.ordinalTextColor }}>urbanstats.org</div>
                <div style={{ fontWeight: 600 }}>{embed.title}</div>
                <div style={{ fontSize: '14px', color: colors.ordinalTextColor }}>{embed.description}</div>
            </div>
        </div>
    )
}

function WorkerDown({ onRetry }: { onRetry: () => void }): ReactNode {
    const colors = useColors()
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
            <div>The embed Worker is not answering. Start it with:</div>
            <code style={{ padding: '10px 12px', backgroundColor: colors.slightlyDifferentBackground, border: `1px solid ${colors.borderNonShadow}`, borderRadius: '4px' }}>
                cd react &amp;&amp; npm run og-preview
            </code>
            <button type="button" onClick={onRetry}>Retry</button>
        </div>
    )
}
