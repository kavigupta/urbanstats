/**
 * Indicates whether we're e2e testing.
 *
 * Use sparingly! Functionality under testing should diverge minimally.
 *
 * Tests should be careful not to clear keys used by this
 */
export class TestUtils {
    readonly isTesting = (window as unknown as TestWindow)['%hammerhead%'] !== undefined
    readonly testIterationId: string
    testSyncing = false

    private constructor() {
        let iterId = localStorage.getItem('testIterationId')
        if (iterId === null) {
            iterId = crypto.randomUUID()
            localStorage.setItem('testIterationId', iterId)
        }
        this.testIterationId = iterId
    }

    static shared = new TestUtils()

    safeClearLocalStorage(): void {
        // eslint-disable-next-line no-restricted-syntax -- This is the safe function
        localStorage.clear()
        localStorage.setItem('testIterationId', this.testIterationId)
    }
}

export interface TestWindow {
    'testUtils': TestUtils
    '%hammerhead%': unknown
}

(window as unknown as TestWindow).testUtils = TestUtils.shared
