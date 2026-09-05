import { ClientFunction, Selector } from 'testcafe'

import { getCodeFromMainField, urlFromCode } from './mapper-utils'
import { getLocation, screencap, urbanstatsFixture, waitForLoading } from './test_utils'

const code = `pMap(
    data=density_pw_1km,
    scale=logScale(),
    ramp=rampUridis,
    relativeArea=population,
    maxRadius=20,
    basemap=noBasemap()
)`

urbanstatsFixture('mapper view mode', urlFromCode('Urban Center', 'Argentina', code))

const editButton = Selector('button').withExactText('Edit')

// TestCafe's native automation can't drive a second window, so the tab View would open becomes this one.
const openInSameTab = ClientFunction(() => {
    window.open = (url) => {
        window.location.href = url as string
        return null
    }
})

test('view opens a viewer whose edit button returns to the editor', async (t) => {
    await waitForLoading()
    await openInSameTab()
    await t.click(Selector('button').withExactText('View'))
    await waitForLoading()
    await t.expect(await getLocation()).contains('view=true')
    await t.expect(editButton.exists).ok()
    await screencap(t, { fullPage: false, removeEntireMap: false })
    await t.click(editButton)
    await waitForLoading()
    await t.expect(editButton.exists).notOk()
    await t.expect((await getCodeFromMainField()).trim()).eql(code)
    await t.expect(await getLocation()).notContains('view=true')
})
