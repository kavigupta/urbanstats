import { ClientFunction, Selector } from 'testcafe'

import { urlFromCode } from './mapper-utils'
import { urbanstatsFixture, waitForLoading } from './test_utils'

urbanstatsFixture(`default map`, '/mapper.html')

function map(n: number): string {
    return `[id^="map-${n}"]`
}

function handle(mapNumber: number, pos: 'move' | 'topRight' | 'bottomRight' | 'bottomLeft' | 'topLeft'): string {
    return `${map(mapNumber)} [data-test="${pos}"]`
}

interface Rect { x: number, y: number, width: number, height: number }

function frame(selector: string): Promise<Rect> {
    const map0 = map(0)
    return ClientFunction(() => {
        const map0Rect = document.querySelector(map0)!.getBoundingClientRect()
        const domRect = document.querySelector(selector)!.getBoundingClientRect()
        return { x: Math.round(domRect.x - map0Rect.x), y: Math.round(domRect.y - map0Rect.y), width: Math.round(domRect.width), height: Math.round(domRect.height) }
    }, { dependencies: { selector, map0 } })()
}

test('move and accept', async (t) => {
    const beforeMoveFrame = { x: 0, y: 365, width: 163, height: 167 }
    const move = { x: 0, y: -200 }
    const afterMoveFrame = { ...beforeMoveFrame, x: beforeMoveFrame.x + move.x, y: beforeMoveFrame.y + move.y }

    await waitForLoading(t)
    await t.expect(frame(map(4))).eql(beforeMoveFrame)
    await t.click(Selector('button').withExactText('Edit Insets'))
    await waitForLoading(t)
    await t.expect(frame(map(4))).eql(beforeMoveFrame)
    await t.hover(handle(4, 'move'))
    await t.drag(handle(4, 'move'), move.x, move.y, { speed: 0.05 })
    await t.expect(frame(map(4))).eql(afterMoveFrame)
    await t.expect(Selector('button:not(:disabled)').withExactText('Accept').exists).ok()
    await t.pressKey('ctrl+z')
    await t.expect(frame(map(4))).eql(beforeMoveFrame)
    await t.expect(Selector('button:disabled').withExactText('Accept').exists).ok()
    await t.pressKey('ctrl+y')
    await t.expect(frame(map(4))).eql(afterMoveFrame)
    await t.click(Selector('button:not(:disabled)').withExactText('Accept'))

    await waitForLoading(t)
    await t.expect(frame(map(4))).eql(afterMoveFrame)
})

// How to test bounds?
