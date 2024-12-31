import React, { createContext, useEffect, useState } from 'react'
import { z } from 'zod'

import { discordFix } from '../discord-fix'
import { Settings } from '../page_template/settings'
import { StatPath } from '../page_template/statistic-tree'

import { ExceptionalPageDescriptor, loadPageDescriptor, PageData, PageDescriptor, pageDescriptorFromURL, pageDescriptorSchema, urlFromPageDescriptor } from './PageDescriptor'

const historyStateSchema = z.object({
    pageDescriptor: pageDescriptorSchema,
    scrollPosition: z.number(),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Ensures that history does not have effects. (aka that stored history state will be able to be parsed)
((typeCheck: z.ZodType<HistoryState, z.ZodTypeDef, HistoryState>): void => undefined)(historyStateSchema)

type HistoryState = z.infer<typeof historyStateSchema>

window.history.scrollRestoration = 'manual'
const history = window.history as {
    replaceState: (data: HistoryState, unused: string, url?: string | URL | null) => void
    pushState: (data: HistoryState, unused: string, url?: string | URL | null) => void
    state: HistoryState | null
    forward: () => void
    back: () => void
}

type PageState = { kind: 'loading', loading: { descriptor: PageDescriptor }, current: { data: PageData, descriptor: ExceptionalPageDescriptor }, loadStartTime: number }
    | { kind: 'loaded', current: { data: PageData, descriptor: ExceptionalPageDescriptor } }

type SubsequentLoadingState = { kind: 'notLoading', updateAt: undefined } | { kind: 'quickLoad', updateAt: number } | { kind: 'longLoad', updateAt: undefined }

function loadingStateFromPageState(pageState: PageState): SubsequentLoadingState {
    if (pageState.kind === 'loaded' || pageState.current.data.kind === 'initialLoad') {
        return { kind: 'notLoading', updateAt: undefined }
    }

    const quickThresholdDuration = (window as { testQuickNavigationDuration?: number }).testQuickNavigationDuration ?? 2000
    return Date.now() - pageState.loadStartTime >= quickThresholdDuration ? { kind: 'longLoad', updateAt: undefined } : { kind: 'quickLoad', updateAt: pageState.loadStartTime + quickThresholdDuration }
}

export interface NavigationOptions {
    history: 'push' | 'replace' | null // What should we do with this browser history? `null` means nothing, usually you want 'push' or 'replace'
    scroll: { kind: 'none' } // Does not perform any scrolling when navigating, just re-render the page in place (will scroll to anchor if hash is present)
    | { kind: 'position', top: number } // Scroll to a specific position
    | { kind: 'element', element: HTMLElement } // Scroll keeping a specific element in the same place
}

export class Navigator {
    /* eslint-disable react-hooks/rules-of-hooks, no-restricted-syntax -- This is a logic class with custom hooks and core navigation functions */
    static Context = createContext(new Navigator())

    private pageState: PageState
    private pageStateObservers = new Set<() => void>()

    // Read by the router to apply React effects on rerender
    // Using this wierd communication with react allows for smooth rendering, as opposed to setting a timeout sometime after the react render
    effects: (() => void)[] = []

    constructor() {
        try {
            const url = new URL(discordFix(window.location.href))
            this.pageState = {
                kind: 'loading',
                loading: { descriptor: pageDescriptorFromURL(url) },
                current: { descriptor: { kind: 'initialLoad', url }, data: { kind: 'initialLoad' } },
                loadStartTime: Date.now(),
            }
            void this.navigate(this.pageState.loading.descriptor, { history: 'replace', scroll: { kind: 'none' } })
        }
        catch (error) {
            const url = new URL(window.location.href)
            this.pageState = {
                kind: 'loaded',
                current: {
                    descriptor: { kind: 'error', url },
                    data: { kind: 'error', url, error },
                },
            }
        }
        window.addEventListener('hashchange', () => {
            void this.navigate(pageDescriptorFromURL(new URL(discordFix(window.location.href))), { history: 'replace', scroll: { kind: 'none' } })
        })
        window.addEventListener('popstate', (popStateEvent: PopStateEvent): void => {
            if (popStateEvent.state === null) {
                // When we use window.location.replace for hashes
                return
            }
            const parseResult = historyStateSchema.safeParse(popStateEvent.state)
            if (parseResult.success) {
                void this.navigate(parseResult.data.pageDescriptor, {
                    history: null,
                    scroll: { kind: 'position', top: parseResult.data.scrollPosition },
                })
            }
            else {
                console.warn(`Failed to parse history state! ${parseResult.error}`)
                location.reload()
            }
        })

        // Must rate limit history updates scrolling, as browsers will do everything from introduce artifical delays, to throwing errors on history update which disrupts other functionality
        // We want scrolling to be LWW even if rate limited
        const minScrollEventInterval = 100

        window.addEventListener('scroll', () => {
            const sinceLastEvent = Date.now() - this.lastScrollHistoryWrite
            if (sinceLastEvent > minScrollEventInterval) {
                this.writeScrollToHistoryState()
            }
            else {
                clearTimeout(this.deferredScrollTimer)
                this.deferredScrollTimer = setTimeout(() => { this.writeScrollToHistoryState() }, minScrollEventInterval - sinceLastEvent)
            }
        })

        /*
         * Don't have the patience to debug #728 https://github.com/kavigupta/urbanstats/issues/728
         * So let's try a hack.
         */
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.pageState.kind === 'loading') {
                console.warn('focused during loading, navigating again')
                void this.navigate(this.pageState.loading.descriptor, { history: null, scroll: { kind: 'none' } })
            }
        })
    }

    deferredScrollTimer: NodeJS.Timeout | undefined
    lastScrollHistoryWrite = Number.MIN_SAFE_INTEGER
    private writeScrollToHistoryState(): void {
        clearTimeout(this.deferredScrollTimer)
        if (history.state === null) {
            return // No first navigation
        }
        this.lastScrollHistoryWrite = Date.now()
        // Helpful debugging statement, keep in
        // console.log(`save ${window.scrollY} -> ${urlFromPageDescriptor(history.state.pageDescriptor)}`)
        history.replaceState({ ...history.state, scrollPosition: window.scrollY }, '')
    }

    async navigate(newDescriptor: PageDescriptor, options: NavigationOptions): Promise<void> {
        this.effects = [] // If we're starting another navigation, don't use previous effects

        // Be sure to save scroll state before modifying the history, as maybe there's still a deferred scroll write in flight
        this.writeScrollToHistoryState()

        switch (options.history) {
            case 'push':
                // scrollPosition gets overwritten later
                history.pushState({ pageDescriptor: newDescriptor, scrollPosition: window.scrollY }, '', urlFromPageDescriptor(newDescriptor))
                break
            case 'replace':
                // scrollPosition gets overwritten later
                history.replaceState({ pageDescriptor: newDescriptor, scrollPosition: window.scrollY }, '', urlFromPageDescriptor(newDescriptor))
                break
            case null:
                break
        }

        const scroll = options.scroll
        let scrollAfterNavigate: (() => void) | null
        switch (scroll.kind) {
            case 'none':
                scrollAfterNavigate = null
                break
            case 'position':
                scrollAfterNavigate = () => { window.scrollTo({ top: scroll.top, behavior: 'instant' }) }
                break
            case 'element':
                const preNavigateElementDistanceFromTop = scroll.element.getBoundingClientRect().top
                scrollAfterNavigate = () => {
                    const postNavigateElementDistanceFromTop = scroll.element.getBoundingClientRect().top
                    const adjustScroll = postNavigateElementDistanceFromTop - preNavigateElementDistanceFromTop
                    window.scrollBy({ top: adjustScroll, behavior: 'instant' })
                }
                break
        }

        this.pageState = { kind: 'loading', loading: { descriptor: newDescriptor }, current: this.pageState.current, loadStartTime: Date.now() }
        this.pageStateObservers.forEach((observer) => { observer() })
        try {
            const { pageData, newPageDescriptor, effects } = await loadPageDescriptor(newDescriptor, Settings.shared)
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Async function, pageState can change during await
            if (this.pageState.kind !== 'loading' || this.pageState.loading.descriptor !== newDescriptor) {
                // Another load has started, don't race it
                return
            }
            const url = urlFromPageDescriptor(newPageDescriptor)
            history.replaceState({
                pageDescriptor: newPageDescriptor,
                // The scroll position here will be overwritten by the effect below if `options.scroll !== null`
                scrollPosition: window.scrollY,
            }, '', url)
            this.pageState = { kind: 'loaded', current: { data: pageData, descriptor: newPageDescriptor } }
            this.pageStateObservers.forEach((observer) => { observer() })

            this.effects.push(effects)

            // On successful navigate

            // If we're going to a page that doesn't use a settings param, exit staging mode if we're in it
            if (!['article', 'comparison'].includes(this.pageState.current.descriptor.kind) && Settings.shared.getStagedKeys() !== undefined) {
                Settings.shared.exitStagedMode('discard')
            }

            // Jump to
            if (scrollAfterNavigate !== null) {
                // higher priority than hash because we're going back to a page that might have a hash, and we don't want the hash to override the saved scroll position
                this.effects.push(() => {
                    scrollAfterNavigate()
                    // As the `scrollTo` method doesn't trigger a scroll event, we need to save the new scroll position manually.
                    this.writeScrollToHistoryState()
                })
            }
            else if (url.hash !== '') {
                this.effects.push(() => {
                    this.scrollToHash(url)
                })
            }
        }
        catch (error) {
            if (this.pageState.kind !== 'loading' || this.pageState.loading.descriptor !== newDescriptor) {
                // Another load has started, don't race it
                return
            }
            this.pageState = {
                kind: 'loaded',
                current: {
                    descriptor: { kind: 'error', url: urlFromPageDescriptor(newDescriptor) },
                    data: { kind: 'error', error, descriptor: newDescriptor, url: urlFromPageDescriptor(newDescriptor) },
                },
            }
            this.pageStateObservers.forEach((observer) => { observer() })
        }
    }

    private scrollToHash(url: URL): void {
        let nextScrollEventIsSeek = false

        const scrollObserver = (): void => {
            if (!nextScrollEventIsSeek) {
                destroyObservers()
            }
            else {
                nextScrollEventIsSeek = false
            }
        }

        // Keep track of the state where we're seeking so we don't keep trying to seek on another page
        const seekedState = this.pageState

        const resizeObserver = new ResizeObserver(() => {
            if (this.pageState === seekedState) {
                seekToHash()
            }
            else {
                destroyObservers()
            }
        })

        const destroyObservers = (): void => {
            resizeObserver.unobserve(document.body)
            window.removeEventListener('scroll', scrollObserver)
        }

        const seekToHash = (): void => {
            const element = document.getElementById(url.hash.substring(1))
            if (element !== null) {
                const position = element.getBoundingClientRect().top + window.scrollY
                if (Math.round(position) !== Math.round(window.scrollY)) {
                    nextScrollEventIsSeek = true
                    window.scrollTo(0, position)
                }
            }
        }

        // If the body height changes, and the user hasn't scrolled yet, this means something (e.g. fonts) have loaded and our hash seek isn't correct.
        resizeObserver.observe(document.body)
        // Scrolling from the user should cancel the hash lock, but not scrolling because we've seeked to the hash
        window.addEventListener('scroll', scrollObserver)

        seekToHash()
    }

    link(pageDescriptor: PageDescriptor, options: {
        scroll: NavigationOptions['scroll']
        postNavigationCallback?: () => void
    }): { href: string, onClick: (e?: React.MouseEvent) => Promise<void> } {
        const url = urlFromPageDescriptor(pageDescriptor)
        return {
            href: url.pathname + url.search + url.hash,
            onClick: async (e?: React.MouseEvent) => {
                if (e?.altKey || e?.ctrlKey || e?.metaKey || e?.shiftKey) {
                    // Some sort of shortcut to open in new tab, etc.
                    return
                }
                e?.preventDefault()
                await this.navigate(pageDescriptor, {
                    history: 'push',
                    scroll: options.scroll,
                })
                options.postNavigationCallback?.()
            },
        }
    }

    usePageState(): PageState {
        const [result, setResult] = useState(this.pageState)

        useEffect(() => {
            const observer = (): void => {
                setResult(this.pageState)
            }
            this.pageStateObservers.add(observer)
            return () => { this.pageStateObservers.delete(observer) }
        }, [])

        return result
    }

    get currentDescriptor(): ExceptionalPageDescriptor {
        return this.pageState.current.descriptor
    }

    get universe(): string | undefined {
        const data = this.pageState.current.data
        switch (data.kind) {
            case 'article':
            case 'comparison':
            case 'statistic':
                return data.universe
            default:
                return undefined
        }
    }

    useUniverse(): string | undefined {
        const [universe, setUniverse] = useState(this.universe)

        useEffect(() => {
            const observer = (): void => {
                setUniverse(this.universe)
            }
            this.pageStateObservers.add(observer)
            return () => { this.pageStateObservers.delete(observer) }
        }, [])

        return universe
    }

    setUniverse(newUniverse: string): void {
        switch (this.pageState.current.descriptor.kind) {
            case 'article':
            case 'comparison':
            case 'statistic':
                void this.navigate({
                    ...this.pageState.current.descriptor,
                    universe: newUniverse,
                }, {
                    history: 'push',
                    scroll: { kind: 'none' },
                })
                break
            default:
                throw new Error(`Page descriptor kind ${this.pageState.current.descriptor.kind} does not have a universe`)
        }
    }

    private get statPaths(): StatPath[][] | undefined {
        switch (this.pageState.current.data.kind) {
            case 'article':
            case 'comparison':
                return this.pageState.current.data.statPaths
            default:
                return undefined
        }
    }

    useStatPathsAll(): StatPath[][] | undefined {
        const [statPaths, setStatPaths] = useState(this.statPaths)

        useEffect(() => {
            const observer = (): void => {
                setStatPaths(this.statPaths)
            }
            this.pageStateObservers.add(observer)
            return () => { this.pageStateObservers.delete(observer) }
        }, [])

        return statPaths
    }

    setSettingsVector(newVector: string): void {
        switch (this.pageState.current.descriptor.kind) {
            case 'article':
            case 'comparison':
                this.pageState.current.descriptor.s = newVector
                history.replaceState({ pageDescriptor: this.pageState.current.descriptor, scrollPosition: window.scrollY }, '', urlFromPageDescriptor(this.pageState.current.descriptor))
                break
            default:
                throw new Error(`Page descriptor kind ${this.pageState.current.descriptor.kind} does not have a settings vector`)
        }
    }

    setMapperSettings(newSettings: string): void {
        switch (this.pageState.current.descriptor.kind) {
            case 'mapper':
                this.pageState.current.descriptor.settings = newSettings
                history.replaceState({ pageDescriptor: this.pageState.current.descriptor, scrollPosition: window.scrollY }, '', urlFromPageDescriptor(this.pageState.current.descriptor))
                break
            default:
                throw new Error(`Page descriptor kind ${this.pageState.current.descriptor.kind} does not have mapper settings`)
        }
    }

    useSubsequentLoading(): SubsequentLoadingState['kind'] {
        const [loading, setLoading] = useState(loadingStateFromPageState(this.pageState))

        useEffect(() => {
            const observer = (): void => {
                setLoading(loadingStateFromPageState(this.pageState))
            }
            this.pageStateObservers.add(observer)
            return () => { this.pageStateObservers.delete(observer) }
        }, [])

        useEffect(() => {
            if (loading.updateAt !== undefined) {
                const timeout = setTimeout(() => {
                    setLoading(loadingStateFromPageState(this.pageState))
                }, loading.updateAt - Date.now())
                return () => { clearTimeout(timeout) }
            }
            else {
                return undefined
            }
        }, [loading.updateAt])

        return loading.kind
    }
    /* eslint-enable react-hooks/rules-of-hooks, no-restricted-syntax */
}
