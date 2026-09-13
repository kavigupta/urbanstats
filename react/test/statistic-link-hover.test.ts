import { Selector } from 'testcafe'

import { screencap, target, urbanstatsFixture, waitForLoading } from './test_utils'

urbanstatsFixture('statistic name link', `${target}/article.html?longname=Indianapolis+IN+HRR%2C+USA`)

const populationLink = Selector('a[data-test-id=statistic-link]').withExactText('Population')

test('hovering a statistic name underlines it', async (t) => {
    await waitForLoading()
    await t.hover(populationLink)
    // fullPage false so the screenshot preparation doesn't hover away from the link
    await screencap(t, { fullPage: false, selector: populationLink.parent('.for-testing-table-row') })
})
