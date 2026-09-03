import type maplibregl from 'maplibre-gl'
import type { ReactElement } from 'react'

import { keptByNoBasemap } from '../components/map-common-utils'

import { elementsWithBadKeys } from './bad-keys'
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
        let settledFrames = 0
        while (settledFrames < mapSettledFrames) {
            // A frame first: right after a commit, `loaded()` can still be true from before the map noticed the new work.
            await new Promise(resolve => requestAnimationFrame(resolve))
            // Read the maps afresh each frame, since one can mount, or remount under a new id, while we wait.
            const pending = Array.from(this.maps.entries()).filter(([, map]) => !map._removed && !map.loaded())
            if (pending.length === 0) {
                settledFrames++
                continue
            }
            settledFrames = 0
            if (Date.now() > deadline) {
                throw new Error(`Maps did not finish rendering within ${mapRenderTimeoutMs}ms: ${pending.map(([id]) => id).join(', ')}`)
            }
        }
    }

    /** Only the bundled build routes `react` through the key checking, so an e2e test triggers it here */
    createElementsWithBadKeys(): ReactElement[] {
        return elementsWithBadKeys()
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

const mapRenderTimeoutMs = 30000

/** maplibre learns about a pending resize after the frame that caused it, so one settled frame isn't enough. */
const mapSettledFrames = 3
