import { Selector } from 'testcafe'

import { toggleCustomScript } from './mapper-utils'
import { getLocation, mapper, target, urbanstatsFixture } from './test_utils'

const docButton = Selector('a[title="USS Documentation"]:not([inert] *)')

mapper(() => test)('uss documentation button links to docs page', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await toggleCustomScript(t)
    await t.expect(docButton.getAttribute('href')).contains('/uss-documentation.html')
    await t.expect(docButton.getAttribute('target')).eql('_blank')
    await t.click(docButton)
    await t.expect(getLocation()).contains('/uss-documentation.html')
})

mapper(() => test)('uss documentation button not present outside custom script mode', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await t.expect(docButton.exists).notOk()
})

urbanstatsFixture('uss docs page has no documentation button', `${target}/uss-documentation.html`)

test('uss documentation button not present on docs page', async (t) => {
    await t.expect(docButton.exists).notOk()
})
