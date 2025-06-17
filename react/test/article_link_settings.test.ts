import { ClientFunction } from 'testcafe'

import { linkSettingsTests } from './link_settings_test_template'
import { screencap, target, urbanstatsFixture } from './test_utils'

linkSettingsTests('/article.html?longname=California%2C+USA')

urbanstatsFixture('article with settings param', `${target}/article.html?longname=California%2C+USA&s=29ZqGgHgeNSXMA9`)

test('legacy settings param produces expected results', async (t) => {
    await screencap(t)
})

urbanstatsFixture('article with election category param', `${target}/article.html?longname=CA-09%2C+USA&category=election`)

test('contains only stats for election', async (t) => {
    const statisticLinkTests = ClientFunction(() => Array.from(document.querySelectorAll('[data-test-id=statistic-link]')).map(element => element.textContent))
    await t.expect(statisticLinkTests()).eql(['2020 Presidential Election', '2016 Presidential Election', '2016-2020 Swing'])
})
