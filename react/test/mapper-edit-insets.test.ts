import { ClientFunction, Selector } from 'testcafe'

import { urlFromCode } from './mapper-utils'
import { urbanstatsFixture } from './test_utils'

urbanstatsFixture(`default map`, '/mapper.html')

function map(n: number): string {
    return `[id^="map-${n}"]`
}

function handle(mapNumber: number, pos: 'move' | 'topRight' | 'bottomRight' | 'bottomLeft' | 'topLeft'): string {
    return `${map(mapNumber)} [data-test="${pos}"]`
}

interface Rect { x: number, y: number, width: number, height: number }

function bounds(selector: string): Promise<Rect> {
    return ClientFunction(() => {
        const domRect = document.querySelector(selector)!.getBoundingClientRect()
        return { x: domRect.x, y: domRect.y, width: domRect.width, height: domRect.height }
    }, { dependencies: { selector } })()
}

test('edit insets', async (t) => {
    await t.click(Selector('button').withExactText('Edit Insets'))
    await t.expect(bounds(map(4))).eql({ x: 348, y: 451.8984375, width: 162.640625, height: 166.8359375 })
})
