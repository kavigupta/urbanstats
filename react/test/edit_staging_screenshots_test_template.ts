import { Selector } from 'testcafe'

import { enterEditMode, yearCheckbox } from './edit_mode_test_utils'
import { comparisonPage, downloadImage, getLocation, resizeForPlatform, target, urbanstatsFixture } from './test_utils'

/**
 * The edit tree and the staging banner are both controls for changing settings, which mean
 * nothing to someone looking at a shared image, so screenshot mode leaves them out. These
 * download the app's own screenshot with each on display; the reference image comparison is
 * what checks it isn't in the result.
 */

const stagingControls = Selector('[data-test-id=staging_controls]')

/** Takes a link with an extra year selected back to a page saved without it, which stages that year. */
async function enterStagingMode(t: TestController): Promise<void> {
    await enterEditMode(t)
    await t.click(yearCheckbox(2010))
    const linkWith2010 = await getLocation()
    await t.click(yearCheckbox(2010))

    await t.navigateTo(linkWith2010)
    await t.expect(stagingControls.exists).ok('the page should be showing the staging banner to leave out')
}

export function editStagingScreenshotTests(platform: 'mobile' | 'desktop'): void {
    const platformFixture = (name: string, url: string): void => {
        urbanstatsFixture(name, url, async (t) => {
            await resizeForPlatform(t, platform)
        })
    }

    platformFixture('article edit and staging screenshots', `${target}/article.html?longname=San+Francisco+city%2C+California%2C+USA`)

    test('article-edit-mode-absent-from-screenshot', async (t) => {
        await enterEditMode(t)
        await downloadImage(t)
    })

    test('article-staging-absent-from-screenshot', async (t) => {
        await enterStagingMode(t)
        await downloadImage(t)
    })

    platformFixture('comparison edit and staging screenshots', comparisonPage([
        'San Francisco city, California, USA',
        'Boston city, Massachusetts, USA',
    ]))

    test('comparison-edit-mode-absent-from-screenshot', async (t) => {
        await enterEditMode(t)
        await downloadImage(t)
    })

    test('comparison-staging-absent-from-screenshot', async (t) => {
        await enterStagingMode(t)
        await downloadImage(t)
    })
}
