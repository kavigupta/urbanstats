/*
 * Enough of a browser for the site's modules to evaluate and for its router to run -- what
 * `loadPageDescriptor` touches on the way through, not an attempt at a real DOM.
 *
 * `settings.ts` reads localStorage in a static initializer, so this has to be installed before any
 * site module is imported: keep it first in the entry's import list.
 */
// The DOM lib types these as things a Worker does not have, so they go in through an untyped view
// of the global object rather than being cast one at a time.
const shim = globalThis as unknown as Record<string, unknown>

shim.window ??= globalThis
shim.location ??= new URL('https://urbanstats.org/')
shim.history ??= {
    scrollRestoration: 'manual',
    state: null,
    pushState: () => undefined,
    replaceState: () => undefined,
}

// Wide enough to clear the site's 1100px mobile breakpoint, so the card gets desktop stat rows.
shim.document ??= {
    documentElement: { clientWidth: 1200, clientHeight: 800 },
}

// The default theme is 'System Theme', so useCurrentTheme asks the media query. Cards are light.
shim.matchMedia ??= () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined })

// Always empty, so settings start from a first-time visitor's defaults. The site only saves
// settings when some are already saved, so a write means that assumption stopped holding: dropping
// it keeps requests independent, which is what the emptiness was buying.
shim.localStorage ??= {
    getItem: () => null,
    setItem: (key: string) => { console.error(`dropped localStorage write to ${key}`) },
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
}
