import { Selector } from 'testcafe'

import { checkBox, toggleCustomScript } from './mapper-utils'
import { safeReload, screencap, target, urbanstatsFixture } from './test_utils'

urbanstatsFixture('mapper', `${target}/mapper.html`)

function expandButton(name?: string): Selector {
    if (name) {
        return Selector(`[data-test=expand-button][data-test-name="${name}"]`)
    }
    else {
        return Selector('[data-test=expand-button]')
    }
}

test('expanded when checking insets, click expand button to collapse', async (t) => {
    await t.expect(expandButton().length).eql(0) // No expand arrows initially
    await checkBox(t, /Insets/)
    await t.expect(expandButton('insets').getAttribute('data-test-state')).eql('true')
    await screencap(t, { selector: Selector('[data-test=split-left]'), scrollTargetY: 1000 })
    await t.click(expandButton('insets'))
    await t.expect(expandButton('insets').getAttribute('data-test-state')).eql('false')
    await screencap(t, { selector: Selector('[data-test=split-left'), scrollTargetY: 1000 })
    await safeReload(t)
    await t.expect(expandButton('insets').getAttribute('data-test-state')).eql('false')
    await toggleCustomScript(t)
    await t.expect(expandButton().length).eql(0)
    await toggleCustomScript(t)
    await t.expect(expandButton('insets').getAttribute('data-test-state')).eql('true')
})
