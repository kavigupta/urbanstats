import { ClientFunction, Selector } from 'testcafe'

import { getLocation, goBack, screencap, target, urbanstatsFixture } from './test_utils'

const errorScreen = Selector('[data-test-id=uncaughtError]')

/**
 * The data credit page keeps the hash in its page descriptor, so the router still sees
 * `#crashForTesting` when the hash change rerenders it. The hash also gives us a history
 * entry that the browser traverses without reloading, which is what the crashed navigator
 * has to handle.
 */
const crash = ClientFunction(() => { location.hash = '#crashForTesting' })

urbanstatsFixture('error boundary', `${target}/data-credit.html`)

test('displays the url and a symbolicated stack', async (t) => {
    // React rethrows what the boundary caught, which TestCafe sees as a page error
    await t.skipJsErrors(true)
    await crash()
    await t.expect(errorScreen.innerText).contains('data-credit.html#crashForTesting')
    // Fetching and parsing the source map takes a while
    await t.expect(errorScreen.find('pre').innerText).contains('src/navigation/routers.tsx:', { timeout: 30000 })
    await screencap(t)
})

test('going back reloads instead of navigating the crashed page', async (t) => {
    await t.skipJsErrors(true)
    await crash()
    await t.expect(errorScreen.exists).ok()
    await goBack()
    await t.expect(errorScreen.exists).notOk({ timeout: 30000 })
    await t.expect(getLocation()).eql(`${target}/data-credit.html`)
})
