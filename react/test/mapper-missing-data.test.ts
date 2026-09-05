import { Selector } from 'testcafe'

import { checkBox, checkSelector, getCodeFromMainField, getErrors, map, toggleCustomScript } from './mapper-utils'
import { getLocation, mapper, screencap, waitForMapsToRender } from './test_utils'

// Iceland's eight regions, with the four below the median population left without a value. Hidden,
// they keep their outlines but lose their fill.
const code = `customNode("");
condition (true)
cMap(
    data=if (population > (median(population))) { density_pw_1km },
    scale=linearScale(),
    ramp=rampUridis,
    label="Density",
    outline=constructOutline(weight=2),
    basemap=noBasemap()
)`

mapper(() => test)('missing values', { code, geo: 'Subnational Region', universe: 'Iceland' }, async (t) => {
    await t.expect(getErrors()).eql([])
    await screencap(t, { removeEntireMap: false })

    await checkBox(t, /^Show Missing Data/)
    await t.expect(getErrors()).eql([])
    await screencap(t, { removeEntireMap: false })

    await checkBox(t, /^Color/)
    await t.expect(getErrors()).eql([])
    await screencap(t, { removeEntireMap: false, scrollPaneTo: checkSelector(/^Show Missing Data/) })

    await toggleCustomScript(t)
    await t.expect(getCodeFromMainField()).contains('missingData=constructMissingData(color=rgb(0, 0, 0))')
})

// Hiding a value only takes away its fill, so the region is still there to be clicked. Austurland,
// Iceland's eastern lobe, is one of the four without a value.
mapper(() => test)('a hidden region is still clickable', { code, geo: 'Subnational Region', universe: 'Iceland' }, async (t) => {
    await waitForMapsToRender()
    const canvas = Selector(`${map(0)} canvas`)
    const { width, height } = await canvas.boundingClientRect
    await t.click(canvas, { offsetX: Math.round(width * 0.82), offsetY: Math.round(height * 0.57) })
    await t.expect(getLocation()).contains('longname=Austurland%2C+Iceland')
})

// A cluster map bins its data rather than colouring it directly, so a missing value needs a bin of
// its own; without one it has no category and its share of the pie goes missing entirely.
const clusterCode = `customNode("");
condition (true)
clusterMap(
    data=if (population > (median(population))) { density_pw_1km },
    scale=linearScale(),
    ramp=rampUridis,
    label="Density",
    basemap=noBasemap()
)`

mapper(() => test)('missing values on a cluster map', { code: clusterCode, geo: 'Subnational Region', universe: 'Iceland' }, async (t) => {
    await t.expect(getErrors()).eql([])
    await screencap(t, { removeEntireMap: false })

    await checkBox(t, /^Show Missing Data/)
    await t.expect(getErrors()).eql([])
    await screencap(t, { removeEntireMap: false })

    await checkBox(t, /^Color/)
    await t.expect(getErrors()).eql([])
    await screencap(t, { removeEntireMap: false, scrollPaneTo: checkSelector(/^Show Missing Data/) })
})
