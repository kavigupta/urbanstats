/*
 * Enough of a browser for the site's modules to evaluate and for its router to run.
 *
 * `settings.ts` reads localStorage in a static initializer, so this has to be installed before any
 * site module is imported -- keep it first in the entry's import list. Backing that store with a
 * plain Map means every Settings instance starts from the defaults, which is what an embed wants:
 * the page a first-time visitor would see, not whatever the last request configured.
 *
 * The rest is what `loadPageDescriptor` touches on the way through, not an attempt at a real DOM.
 */
// The globals below are all typed by the DOM lib as things a Worker does not have, so they are
// installed through an untyped view of the global object rather than cast one at a time.
const shim = globalThis as unknown as Record<string, unknown>

shim.window ??= globalThis
shim.location ??= new URL('https://urbanstats.org/')
shim.history ??= {
    scrollRestoration: 'manual',
    state: null,
    pushState: () => undefined,
    replaceState: () => undefined,
}

// Wide enough to clear the site's 1100px mobile breakpoint: the card is a desktop-shaped image, so
// it should get the desktop stat rows.
shim.document ??= {
    documentElement: { clientWidth: 1200, clientHeight: 800 },
}

// The default theme is 'System Theme', so useCurrentTheme asks the media query. A card is a light
// image on every platform that shows it, so answer as a light-mode client.
shim.matchMedia ??= () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined })

const store = new Map<string, string>()

shim.localStorage ??= {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
        return store.size
    },
}
