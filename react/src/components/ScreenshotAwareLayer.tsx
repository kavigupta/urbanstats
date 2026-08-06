import React, { ReactNode, useEffect } from 'react'
// eslint-disable-next-line no-restricted-imports -- ScreenshotAwareLayer is the wrapper everyone else must use
import { Layer, LayerProps, useMap } from 'react-map-gl/maplibre'

import { assert } from '../utils/defensive'

import { useScreenshotCallback } from './screenshot'

/*
 * Use instead of react-map-gl's <Layer> so screenshots wait for the layer.
 * This solves the problem of the layer not being present even after the `render` screenshot phase.
 * If this happens, then map.loaded() doesn't wait for the layer.
 */
export function ScreenshotAwareLayer(props: LayerProps & { id: string }): ReactNode {
    const { current: map } = useMap()
    assert(map !== undefined, 'Must be used in Map context')

    const screenshotCallback = useScreenshotCallback('render')

    useEffect(() => {
        if (screenshotCallback === undefined) {
            return undefined
        }
        let cancelled: boolean = false
        void (async () => {
            while (map.getLayer(props.id) === undefined) {
                await new Promise(resolve => requestAnimationFrame(resolve))
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Linter is too dumb
                if (cancelled) {
                    // The cleanup has either unregistered us or is about to re-run the effect,
                    // so the screenshot's wait is not ours to settle any more.
                    return
                }
                if (map._removed) {
                    break // Nothing will add the layer now, don't stall the screenshot
                }
            }
            screenshotCallback()
        })()
        return () => {
            cancelled = true
        }
    }, [screenshotCallback, map, props.id])

    // react-map-gl memoizes the layer id at mount, so a changed id only takes effect on remount.
    return <Layer key={props.id} {...props} />
}
