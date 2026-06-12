const enableDebugLogging = {
    search: false,
    searchPerformance: false,
    waitForLoading: false,
    undoRedo: false,
}

export function makeDebugLogger(category: keyof typeof enableDebugLogging): (...args: unknown[]) => void {
    if (enableDebugLogging[category]) {
        // eslint-disable-next-line no-console -- Debug logging
        return (...args) => { console.log(...args) }
    }
    else {
        return () => undefined
    }
}
