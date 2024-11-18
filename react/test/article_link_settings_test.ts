import { linkSettingsTests } from './link_settings_test_template'
import { screencap, TARGET, urbanstatsFixture } from './test_utils'

linkSettingsTests('/article.html?longname=California%2C+USA')

urbanstatsFixture('article with settings param', `${TARGET}/article.html?longname=California%2C+USA&s=29ZqGgHgeNSXMA9`)

test('legacy settings param produces expected results', async (t) => {
    await screencap(t)
})
