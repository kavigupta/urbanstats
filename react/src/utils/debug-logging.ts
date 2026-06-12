const enableDebugLogging = {
    search: false,
    searchPerformance: false,
    waitForLoading: false,
    undoRedo: false,
}

type Key = keyof typeof enableDebugLogging

export function makeDebugLogger(...categories: [Key, ...Key[]]): (...args: unknown[]) => void {
    if (categories.some(category => enableDebugLogging[category])) {
        // eslint-disable-next-line no-console -- Debug logging
        return (...args) => { console.log(`[${categories.join(',')}]`, ...args) }
    }
    else {
        return () => undefined
    }
}
