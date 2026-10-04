/*
 * Just enough browser globals for `loadPageDescriptor` to run. Import this before any site module,
 * since `settings.ts` reads localStorage as it loads.
 */
// Untyped, since the DOM lib types these as things a Worker doesn't have.
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

// Always empty, so settings are a first-time visitor's. Writes are dropped to keep requests independent.
shim.localStorage ??= {
    getItem: () => null,
    setItem: (key: string) => { console.error(`dropped localStorage write to ${key}`) },
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
}
