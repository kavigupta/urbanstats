import type maplibregl from 'maplibre-gl'

/**
 * Indicates whether we're e2e testing.
 *
 * Use sparingly! Functionality under testing should diverge minimally.
 *
 * Tests should be careful not to clear keys used by this
 */
export class TestUtils {
    readonly isTesting = (window as unknown as TestWindow)['%hammerhead%'] !== undefined
    readonly testIterationId: string | undefined
    testSyncing = false

    private constructor() {
        let iterId = localStorage.getItem('testIterationId')
        if (iterId === null && this.isTesting) {
            iterId = crypto.randomUUID()
            localStorage.setItem('testIterationId', iterId)
        }
        if (iterId !== null && !this.isTesting) {
            iterId = null
            localStorage.removeItem('testIterationId')
        }
        this.testIterationId = iterId ?? undefined
    }

    static shared = new TestUtils()

    safeClearLocalStorage(): void {
        const quizAuthEnabled = localStorage.getItem('enable_auth_features')
        // eslint-disable-next-line no-restricted-syntax -- This is the safe function
        localStorage.clear()
        if (this.testIterationId !== undefined) {
            localStorage.setItem('testIterationId', this.testIterationId)
        }
        if (quizAuthEnabled !== null) {
            localStorage.setItem('enable_auth_features', quizAuthEnabled)
        }
    }

    readonly maps = new Map<string, WeakRef<maplibregl.Map>>()

    readonly clickableMaps = new Map<string, {
        clickFeature: (name: string) => void
        features: string[]
    }>()

    private loadingCounter = 0
    private loadingCallbacks: (() => void)[] = []

    startLoading(): void {
        this.loadingCounter++
    }

    private async eventLoopIters(iters: number): Promise<void> {
        for (;iters > 0; iters--) {
            await new Promise(resolve => setTimeout(resolve, 0))
        }
    }

    async finishLoading(): Promise<void> {
        await this.eventLoopIters(10)
        this.loadingCounter--
        if (this.loadingCounter === 0) {
            this.loadingCallbacks.forEach((callback) => { callback() })
            this.loadingCallbacks = []
        }
    }

    async waitForLoading(): Promise<void> {
        await this.eventLoopIters(10)
        if (this.loadingCounter === 0) {
            return Promise.resolve()
        }
        else {
            return new Promise((resolve) => {
                this.loadingCallbacks.push(resolve)
            })
        }
    }
}

export interface TestWindow {
    'testUtils': TestUtils
    '%hammerhead%': unknown
}

(window as unknown as TestWindow).testUtils = TestUtils.shared
