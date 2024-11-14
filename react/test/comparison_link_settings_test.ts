import { linkSettingsTests } from './link_settings_test_template'
import { screencap, urbanstatsFixture } from './test_utils'

linkSettingsTests('/comparison.html?longnames=%5B%22Knoxville+%5BUrban+Area%5D%2C+TN%2C+USA%22%2C%22Louisville+KY+HSA%2C+Louisville+KY+HRR%2C+USA%22%5D')

urbanstatsFixture('comparison with settings param', '/comparison.html?longnames=%5B"Kenya"%2C"Madagascar"%5D&s=6cTD8Hnxvyzn6us')

test('legacy settings param produces expected results', async (t) => {
    await screencap(t)
})
