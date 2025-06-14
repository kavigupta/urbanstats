/**
 * Indicates whether we're e2e testing.
 *
 * Use sparingly! Functionality under testing should diverge minimally.
 */
export function isTesting(): boolean {
    return navigator.userAgent.includes(testingUserAgent)
}

export const testingUserAgent = 'urbanstats-e2e'

export const checkString = true
