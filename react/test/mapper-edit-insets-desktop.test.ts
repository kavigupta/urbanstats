import { ClientFunction, Selector } from 'testcafe'

import { runTests } from './mapper-edit-insets'
import { drag, editInsetsButton, handle, map, numMaps, toggleCustomScript, urlFromCode } from './mapper-utils'
import { downloadImage, urbanstatsFixture, waitForMapsToRender, wheel } from './test_utils'

runTests('desktop')

urbanstatsFixture('usa no basemap', urlFromCode('County', 'USA', `cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    basemap=noBasemap()
)`))

test('accepting normalizes the screen bounds, which stay put while editing', async (t) => {
    await toggleCustomScript(t)

    const aspectRatio = (): Promise<number> => ClientFunction(() => {
        const rect = document.querySelector('#map-0')!.parentElement!.getBoundingClientRect()
        return rect.width / rect.height
    })()

    const extent = (): Promise<{ left: number, right: number, top: number, bottom: number }> => ClientFunction(() => {
        const containerRect = document.querySelector('#map-0')!.parentElement!.getBoundingClientRect()
        const rects = Array.from(document.querySelectorAll('[id^="map-"]')).map(m => m.getBoundingClientRect())
        return {
            left: Math.min(...rects.map(r => (r.left - containerRect.left) / containerRect.width)),
            right: Math.max(...rects.map(r => (r.right - containerRect.left) / containerRect.width)),
            top: Math.min(...rects.map(r => (r.top - containerRect.top) / containerRect.height)),
            bottom: Math.max(...rects.map(r => (r.bottom - containerRect.top) / containerRect.height)),
        }
    })()

    await t.click(editInsetsButton)
    const initialAspectRatio = await aspectRatio()
    const expectAspectRatioHeld = async (): Promise<void> => {
        const current = await aspectRatio()
        await t.expect(Math.abs(current - initialAspectRatio) < 0.01).ok(`aspect ratio moved from ${initialAspectRatio} to ${current}`)
    }

    // Guam, and then Puerto Rico, which takes its index
    await t.click(handle(1, 'delete'))
    await t.expect(numMaps()).eql(4)
    await t.click(handle(1, 'delete'))
    await t.expect(numMaps()).eql(3)
    await expectAspectRatioHeld()

    // narrow the main map into a portrait frame, away from the top and right edges
    const fullWidth = (await Selector(map(0)).boundingClientRect).width
    await drag(t, handle(0, 'topRight'), -Math.round(fullWidth * 0.65), 50)
    await expectAspectRatioHeld()

    await t.hover(map(0))
    await wheel(t, map(0), -1000, { x: 0, y: 0 })
    await t.drag(map(0), 300, -300, { speed: 0.1, offsetX: 50, offsetY: 100 })
    await wheel(t, map(0), -100, { x: 0, y: 0 })
    await t.drag(map(0), 0, -50, { speed: 0.1, offsetX: 50, offsetY: 100 })
    await expectAspectRatioHeld()

    await t.click(Selector('button:not(:disabled)').withExactText('Accept'))

    const normalized = await extent()
    await t.expect(normalized.left).lt(0.01)
    await t.expect(normalized.right).gt(0.99)
    await t.expect(normalized.top).lt(0.01)
    await t.expect(normalized.bottom).gt(0.99)
    await t.expect(numMaps()).eql(3)

    await waitForMapsToRender()
    await downloadImage(t)
})
