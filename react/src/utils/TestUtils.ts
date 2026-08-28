import type maplibregl from 'maplibre-gl'

import { keptByNoBasemap } from '../components/map-common-utils'

import { makeDebugLogger } from './debug-logging'

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

    readonly maps = new Map<string, maplibregl.Map>()

    readonly clickableMaps = new Map<string, {
        clickFeature: (name: string) => void
        features: string[]
    }>()

    private loadingCounter = 0
    private loadingCallbacks: (() => void)[] = []

    startLoading(label: string): void {
        this.loadingCounter++
        debugWait(`startLoading ${this.loadingCounter} ${label}`)
    }

    private async eventLoopIters(iters: number): Promise<void> {
        for (;iters > 0; iters--) {
            await new Promise(resolve => setTimeout(resolve, 0))
        }
    }

    async finishLoading(label: string): Promise<void> {
        await this.eventLoopIters(10)
        this.loadingCounter--
        debugWait(`stopLoading ${this.loadingCounter} ${label}`)
        if (this.loadingCounter === 0) {
            this.loadingCallbacks.forEach((callback) => { callback() })
            this.loadingCallbacks = []
        }
    }

    async waitForLoading(label: string): Promise<void> {
        await this.eventLoopIters(10)
        debugWait(`waitForLoading ${this.loadingCounter} ${label}`)
        if (this.loadingCounter === 0) {
            return Promise.resolve()
        }
        else {
            return new Promise((resolve) => {
                this.loadingCallbacks.push(resolve)
            })
        }
    }

    /**
     * A screenshot taken while the map is still loading catches polygon edges a pixel or two off,
     * which is enough to fail the near-exact screenshot comparison.
     */
    async waitForMapsToRender(): Promise<void> {
        const deadline = Date.now() + mapRenderTimeoutMs
        await Promise.all(Array.from(this.maps.values()).map(async (map) => {
            // A frame first: right after a commit, `loaded()` can still be true from before the map noticed the new work.
            do {
                await new Promise(resolve => requestAnimationFrame(resolve))
            } while (!map._removed && !map.loaded() && Date.now() < deadline)
        }))
    }

    disableBasemapLayers(): void {
        for (const map of this.maps.values()) {
            const layers = map.getLayersOrder()
            for (const layerId of layers) {
                const layer = map.getLayer(layerId)
                if (layer && !keptByNoBasemap(layer)) {
                    map.setLayoutProperty(layerId, 'visibility', 'none')
                }
            }
        }
    }
}

export interface TestWindow {
    'testUtils': TestUtils
    '%hammerhead%': unknown
}

(window as unknown as TestWindow).testUtils = TestUtils.shared

const debugWait = makeDebugLogger('waitForLoading')

const mapRenderTimeoutMs = 5000
