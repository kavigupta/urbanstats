import stableStringify from 'json-stable-stringify'
import { ClientFunction, Selector } from 'testcafe'

import { TestWindow } from '../src/utils/TestUtils'

import { toggleCustomScript, urlFromCode } from './mapper-utils'
import { screencap, urbanstatsFixture } from './test_utils'

urbanstatsFixture(`default map`, '/mapper.html')

function numMaps(): Promise<number> {
    return Selector('[id^="map-"]').count
}

function map(n: number): string {
    return `[id^="map-${n}"]`
}

function handle(mapNumber: number, pos: 'move' | 'topRight' | 'bottomRight' | 'bottomLeft' | 'topLeft'): string {
    return `${map(mapNumber)} [data-test="${pos}"]`
}

interface Bounds { n: number, e: number, s: number, w: number }

function bounds(mapNumber: number): Promise<Bounds> {
    const mapSelector = map(mapNumber)
    return ClientFunction(() => {
        const mapId = document.querySelector(mapSelector)!.id
        const mapObj = (window as unknown as TestWindow).testUtils.maps.get(mapId)!.deref()!
        const latLon = mapObj.getBounds()
        return {
            n: Math.round(latLon.getNorth()),
            e: Math.round(latLon.getEast()),
            s: Math.round(latLon.getSouth()),
            w: Math.round(latLon.getWest()),
        }
    }, { dependencies: { mapSelector } })()
}

interface Rect { x: number, y: number, width: number, height: number }

function frame(selector: string): Promise<Rect> {
    const map0 = map(0)
    return ClientFunction(() => {
        const map0Rect = document.querySelector(map0)!.getBoundingClientRect()
        const domRect = document.querySelector(selector)!.getBoundingClientRect()
        // Fudge Y since it's unstable
        return { x: Math.round(domRect.x - map0Rect.x), y: Math.round((domRect.y - map0Rect.y) / 5) * 5, width: Math.round(domRect.width), height: Math.round(domRect.height / 5) * 5 }
    }, { dependencies: { selector, map0 } })()
}

async function drag(t: TestController, selector: string, deltaX: number, deltaY: number): Promise<void> {
    const elementRect = await Selector(selector).boundingClientRect
    const downEvent = { pointerId: 1, clientX: (elementRect.left + elementRect.right) / 2, clientY: (elementRect.bottom + elementRect.top) / 2 }
    const upEvent = { ...downEvent, clientX: downEvent.clientX + deltaX, clientY: downEvent.clientY + deltaY }
    await t.dispatchEvent(selector, 'pointerdown', downEvent).dispatchEvent(selector, 'pointermove', upEvent).dispatchEvent(selector, 'pointerup', upEvent)
}

async function wheel(t: TestController, selector: string, deltaY: number, offset: { x: number, y: number }): Promise<void> {
    return ClientFunction(() => {
        const element = document.querySelector(`${selector} .maplibregl-canvas-container`)!
        const elementRect = element.getBoundingClientRect()
        const eventLocation = { clientX: ((elementRect.left + elementRect.right) / 2) + offset.x, clientY: ((elementRect.bottom + elementRect.top) / 2) + offset.y }
        // Magic constant simulates a scroll wheel so our events are processed properly
        element.dispatchEvent(new WheelEvent('wheel', { deltaY: deltaY * 4.000244140625, ...eventLocation }))
    }, { dependencies: { selector, deltaY, offset } })()
}

type MapPositions = { frame: Rect, bounds: Bounds }[]

function insetsEditTest(testFn: () => TestFn, { description, action, before, after }: {
    description: string
    action: (t: TestController) => Promise<void>
    before: MapPositions
    after: MapPositions
}): void {
    for (const confirmation of ['Accept', 'Cancel'] as const) {
        testFn()(`${description} then ${confirmation}`, async (t) => {
            const check = async (positions: MapPositions): Promise<void> => {
                let currentPositions
                for (let iter = 0; iter < 3; iter++) {
                    currentPositions = await Promise.all(Array.from({ length: await numMaps() }).map(async (_, i) => ({ frame: await frame(map(i)), bounds: await bounds(i) })))
                    if (stableStringify(currentPositions) !== stableStringify(positions)) {
                        console.warn('.')
                        await t.wait(1000)
                    }
                    else {
                        break
                    }
                }
                if (stableStringify(currentPositions) !== stableStringify(positions)) {
                    console.warn(currentPositions)
                }
                await t.expect(currentPositions).eql(positions)
            }

            await check(before)
            await t.click(Selector('button').withExactText('Edit Insets'))
            await check(before)
            await action(t)
            await check(after)
            await t.expect(Selector('button:not(:disabled)').withExactText('Accept').exists).ok()
            await t.wait(1000) // These waits are connected with the nonUserPanZoomOcurring hack
            await t.pressKey('ctrl+z')
            await check(before)
            await t.expect(Selector('button:disabled').withExactText('Accept').exists).ok()
            await t.wait(1000)
            await t.pressKey('ctrl+y')
            await check(after)
            await t.wait(1000)
            await t.click(Selector('button:not(:disabled)').withExactText(confirmation))

            if (confirmation === 'Accept') {
                await check(after)
            }
            else {
                await check(before)
            }
        })
    }
}

const defaultUSA = [
    {
        frame: { x: 0, y: 0, width: 992, height: 530 },
        bounds: { n: 50, e: -65, s: 23, w: -130 },
    },
    {
        frame: { x: 914, y: 355, width: 78, height: 105 },
        bounds: { n: 14, e: 145, s: 13, w: 144 },
    },
    {
        frame: { x: 837, y: 460, width: 155, height: 70 },
        bounds: { n: 19, e: -64, s: 17, w: -68 },
    },
    {
        frame: { x: 163, y: 440, width: 161, height: 90 },
        bounds: { n: 23, e: -153, s: 18, w: -162 },
    },
    {
        frame: { x: 0, y: 365, width: 163, height: 165 },
        bounds: { n: 72, e: -127, s: 51, w: -172 },
    },
]

const move = { x: 200, y: -200 }
const resize = 50

insetsEditTest(() => test, {
    description: 'move frame',
    action: t => drag(t, handle(4, 'move'), move.x, move.y),
    before: defaultUSA,
    after: [...defaultUSA.slice(0, 4), { frame: { ...defaultUSA[4].frame, x: defaultUSA[4].frame.x + move.x, y: defaultUSA[4].frame.y + move.y }, bounds: defaultUSA[4].bounds }],
})

insetsEditTest(() => test, {
    description: 'resize frame',
    action: t => drag(t, handle(4, 'topRight'), resize, -resize),
    before: defaultUSA,
    after: [...defaultUSA.slice(0, 4), {
        frame: {
            x: defaultUSA[4].frame.x,
            y: defaultUSA[4].frame.y - resize,
            width: defaultUSA[4].frame.width + resize,
            height: defaultUSA[4].frame.height + resize,
        },
        bounds: { n: 72, e: -126, s: 51, w: -172 },
    }],
})

insetsEditTest(() => test, {
    description: 'move bounds',
    action: t => t.drag(map(0), 50, 50, { speed: 0.1, offsetX: 50, offsetY: 50 }),
    before: defaultUSA,
    after: [{ ...defaultUSA[0], bounds: { n: 52, e: -68, s: 26, w: -133 } }, ...defaultUSA.slice(1)],
})

insetsEditTest(() => test, {
    description: 'zoom bounds',
    action: t => wheel(t, map(3), -250, { x: 10, y: 10 }),
    before: defaultUSA,
    after: [...defaultUSA.slice(0, 3), { ...defaultUSA[3], bounds: { n: 23, e: -155, s: 20, w: -160 } }, ...defaultUSA.slice(4)],
})

test('edit interface', async (t) => {
    await t.click(Selector('button').withExactText('Edit Insets'))
    await screencap(t)
})

const populationConditionCode = `
condition (population > 1000000)
cMap(data=density_pw_1km + density_aw, scale=linearScale(), ramp=rampUridis)
`

const populationConditionUrl = urlFromCode('County', 'USA', populationConditionCode)
urbanstatsFixture(`insets with population condition`, populationConditionUrl)

test('insets page with population condition', async (t) => {
    await toggleCustomScript(t)
    await t.click(Selector('button').withExactText('Edit Insets'))
    await screencap(t)
})
