import assert from 'assert/strict'
import { test } from 'node:test'

import { cardInsets } from '../cf-og-worker/src/map-layout'
import { Inset, InsetNode } from '../src/urban-stats-script/constants/insets'

function inset(name: string, mainMap: boolean, coordBox: Inset['coordBox']): Inset {
    return { bottomLeft: [0, 0], topRight: [1, 1], coordBox, mainMap, name }
}

const california: [number, number][] = [[-124, 32], [-114, 32], [-114, 42], [-124, 42], [-124, 32]]

void test('the card drops an empty cell of a split, as the page does', () => {
    const insets: InsetNode[] = [
        inset('USA', true, [-130, 22, -65, 50]),
        {
            bottomLeft: [0.6, 0.1],
            topRight: [0.9, 0.4],
            direction: 'horizontal',
            children: [
                { insets: [inset('Bay Area', false, [-122.8, 37.1, -121.4, 38])], proportion: 1 },
                { insets: [inset('South Atlantic', false, [-30, -40, -20, -30])], proportion: 1 },
            ],
        },
    ]
    const contents = { kind: 'shapes' as const, shapes: [{ rings: [california], fill: '' }], outline: { color: '', weight: 0 } }
    assert.deepEqual(cardInsets(insets, contents).map(({ name, bottomLeft, topRight }) => [name, ...bottomLeft, ...topRight]), [
        ['USA', 0, 0, 1, 1],
        ['Bay Area', 0.6, 0.1, 0.9, 0.4],
    ])
})
