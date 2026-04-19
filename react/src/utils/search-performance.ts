const debugSearchPerformance: boolean = false

export function debugPerformance(arg: unknown): void {
    if (debugSearchPerformance) {
        // eslint-disable-next-line no-console -- Debug logging
        console.log(arg)
    }
}

export const simulateSlowSearch: boolean = false
