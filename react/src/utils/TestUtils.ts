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
    private loadingElement = ((): HTMLDivElement => {
        const result = document.createElement('div')
        result.textContent = 'Loading...'
        result.style.position = 'fixed'
        // eslint-disable-next-line no-restricted-syntax -- Test utils
        result.style.color = '#ff0000'
        result.style.top = '0px'
        result.style.left = '0px'
        return result
    })()

    startLoading(): void {
        if (this.loadingCounter === 0 && this.isTesting) {
            console.warn('Loading start')
            document.body.appendChild(this.loadingElement)
        }
        this.loadingCounter++
    }

    private eventLoopIters(iters: number, callback: () => void): void {
        if (iters === 0) {
            callback()
        }
        else {
            setTimeout(() => {
                this.eventLoopIters(iters - 1, callback)
            }, 0)
        }
    }

    finishLoading(): void {
        this.eventLoopIters(10, () => {
            this.loadingCounter--
            if (this.loadingCounter === 0) {
                this.loadingCallbacks.forEach((callback) => { callback() })
                this.loadingCallbacks = []
                if (this.isTesting) {
                    this.loadingElement.remove()
                    console.warn('Loading finish')
                }
            }
        })
    }

    waitForLoading(): Promise<void> {
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
