import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { deleteInsets, fitInsetMapBounds, InsetEdits, setInsets, splitInsets } from '../src/mapper/settings/edit-insets'
import { UrbanStatsASTExpression } from '../src/urban-stats-script/ast'
import { deconstruct, Inset, InsetNode, layoutInsets, mapNode, pruneInsets } from '../src/urban-stats-script/constants/insets'
import { evaluate } from '../src/urban-stats-script/interpreter'
import { computeAspectRatioForInsets } from '../src/utils/coordinates'

import { emptyContextWithInsets, parseExpr } from './urban-stats-script-utils'

function leaf(name: string, mainMap = false, bottomLeft: [number, number] = [0, 0], topRight: [number, number] = [1, 1]): Inset {
    return { bottomLeft, topRight, coordBox: [-130, 20, -60, 55], mainMap, name }
}

function evaluateInset(uss: string): InsetNode {
    return (evaluate(parseExpr(uss), emptyContextWithInsets([])).value as { value: InsetNode }).value
}

function frames(nodes: InsetNode[]): Record<string, number[]> {
    return Object.fromEntries(layoutInsets(nodes).leaves.map(l => [l.name ?? '', [...l.bottomLeft, ...l.topRight]]))
}

const usa = [leaf('main', true), leaf('alaska', false, [0, 0], [0.25, 0.25])]

const noEdits: InsetEdits = { insets: i => i, ast: (a: UrbanStatsASTExpression[]) => a }

function insetUSS(name: string, mainMap: boolean, screenBounds: string): string {
    return `constructInset(screenBounds=${screenBounds}, mapBounds={ north: 55, east: -60, south: 20, west: -130 }, mainMap=${mainMap}, name="${name}")`
}

const full = '{ north: 1, east: 1, south: 0, west: 0 }'

void describe('constructSplitInset', () => {
    const split = `constructSplitInset([
        { insets: [${insetUSS('a', true, full)}, ${insetUSS('aSmall', false, '{ north: 0.5, east: 0.5, south: 0, west: 0 }')}], proportion: 3 },
        { insets: [constructSplitInset([
            { insets: [${insetUSS('b', true, full)}], proportion: 1 },
            { insets: [], proportion: 1 }
        ], direction=splitVertical, screenBounds=${full})], proportion: 1 }
    ], direction=splitHorizontal, screenBounds={ north: 1, east: 1, south: 0.5, west: 0 })`

    void test('lays out each cell\'s insets relative to the cell', () => {
        assert.deepEqual(frames([evaluateInset(split)]), {
            a: [0, 0.5, 0.75, 1],
            aSmall: [0, 0.5, 0.375, 0.75],
            b: [0.75, 0.75, 1, 1],
        })
    })

    void test('deconstructs to an equivalent expression', () => {
        const node = evaluateInset(split)
        assert.deepEqual(evaluate(deconstruct(node), emptyContextWithInsets([])).value, { type: 'opaque', opaqueType: 'inset', value: node })
    })

    void test('pruning collapses a split left with one cell, but keeps cells that were already empty', () => {
        const pruned = pruneInsets([evaluateInset(split)], inset => inset.name === 'b')
        assert.deepEqual(frames(pruned), { b: [0, 0.75, 1, 1] })
        assert.equal(layoutInsets(pruned).splits.length, 1)
    })
})

void describe('editing split insets', () => {
    void test('splitting a main map splits its whole list, keeping main map status', () => {
        assert.deepEqual(layoutInsets(splitInsets(usa, [0], 'horizontal')).leaves.map(l => [l.name, l.mainMap, ...l.bottomLeft, ...l.topRight]), [
            ['main', true, 0, 0, 0.5, 1],
            ['alaska', false, 0, 0, 0.125, 0.25],
            ['main', true, 0.5, 0, 1, 1],
            ['alaska', false, 0.5, 0, 0.625, 0.25],
        ])
    })

    void test('splitting another inset splits only it, in place', () => {
        const split = splitInsets(usa, [1], 'vertical')
        assert.deepEqual(layoutInsets(split).leaves.map(l => [l.name, ...l.bottomLeft, ...l.topRight]), [
            ['main', 0, 0, 1, 1],
            ['alaska', 0, 0.125, 0.25, 0.25],
            ['alaska', 0, 0, 0.25, 0.125],
        ])
    })

    void test('splitting a whole cell in the direction of its split adds a cell', () => {
        const split = splitInsets(usa, [0], 'horizontal')
        const proportions = (insets: InsetNode[]): number[] => layoutInsets(insets).splits[0].split.children.map(({ proportion }) => proportion)
        assert.deepEqual(proportions(splitInsets(split, [0, 1, 0], 'horizontal')), [1, 1, 1])
        assert.deepEqual(layoutInsets(splitInsets(split, [0, 1, 0], 'vertical')).splits.map(s => s.path), [[0], [0, 1, 0]])
    })

    void test('deleting a main map in a split deletes its cell, collapsing the split', () => {
        const split = splitInsets(usa, [0], 'horizontal')
        assert.deepEqual(deleteInsets(split, [0, 0, 0]), usa)
        assert.equal(layoutInsets(deleteInsets(split, [0, 0, 1])).leaves.length, 3)
    })

    void test('only the top level insets that changed are rewritten', () => {
        const insets = [...usa, leaf('hawaii', false, [0.5, 0], [0.75, 0.25])]
        const ast = insets.map(deconstruct)
        const edited = setInsets(noEdits, insets, [insets[0], leaf('alaska2'), insets[2]])
        assert.deepEqual(edited.ast(ast).map((expr, i) => expr === ast[i]), [true, false, true])
    })
})

void describe('fitInsetMapBounds', () => {
    void test('fitting a split with one cell keeps the split', () => {
        const original: InsetNode[] = [{ bottomLeft: [0, 0], topRight: [1, 1], direction: 'horizontal', children: [{ insets: usa, proportion: 1 }] }]
        const narrowed = mapNode(original, [0], node => [{ ...node, topRight: [0.5, 1] }])
        const fitted = fitInsetMapBounds(setInsets(noEdits, original, narrowed), original, 2).insets(original)
        assert.deepEqual(layoutInsets(fitted).splits.map(s => s.path), [[0]])
    })

    void test('accepting a split keeps the canvas aspect ratio', () => {
        const original = [leaf('a', true)]
        const canvasAspectRatio = computeAspectRatioForInsets(original)
        const split = setInsets(noEdits, original, splitInsets(original, [0], 'horizontal'))
        const fitted = fitInsetMapBounds(split, original, canvasAspectRatio).insets(original)
        assert.ok(Math.abs(computeAspectRatioForInsets(layoutInsets(fitted).leaves) / canvasAspectRatio - 1) < 1e-6)
    })
})
