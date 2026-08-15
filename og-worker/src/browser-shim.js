/*
 * The site's modules assume a browser. Importing any of them reaches `settings.ts`, whose static
 * initializer reads localStorage at module-evaluation time, so this has to be installed before any
 * of them are imported -- keep it first in the entry's import list.
 *
 * Backing settings with a plain Map gives every request a Settings instance holding the defaults,
 * which is what an embed wants: it should render the page a first-time visitor would see, not
 * whatever the last request happened to configure.
 */
/*
 * Enough of a browser for the site's modules to evaluate. Importing its article loader reaches
 * Navigator, which on load stamps history.scrollRestoration and parses location.href -- so these
 * are what a module graph touches on the way up, not an attempt at a real DOM.
 */
globalThis.window ??= globalThis
globalThis.location ??= new URL('https://urbanstats.org/')
globalThis.history ??= {
    scrollRestoration: 'manual',
    state: null,
    pushState: () => {},
    replaceState: () => {},
}

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
