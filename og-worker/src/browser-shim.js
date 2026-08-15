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
globalThis.window ??= globalThis
globalThis.location ??= new URL('https://urbanstats.org/')
globalThis.history ??= {
    scrollRestoration: 'manual',
    state: null,
    pushState: () => {},
    replaceState: () => {},
}

// Wide enough to clear the site's 1100px mobile breakpoint: the card is a desktop-shaped image, so
// it should get the desktop stat rows.
globalThis.document ??= {
    documentElement: { clientWidth: 1200, clientHeight: 800 },
}

// The default theme is 'System Theme', so useCurrentTheme asks the media query. A card is a light
// image on every platform that shows it, so answer as a light-mode client.
globalThis.matchMedia ??= () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })

const store = new Map()

globalThis.localStorage ??= {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, String(value)) },
    removeItem: (key) => { store.delete(key) },
    clear: () => { store.clear() },
    key: index => [...store.keys()][index] ?? null,
    get length() {
        return store.size
    },
}
