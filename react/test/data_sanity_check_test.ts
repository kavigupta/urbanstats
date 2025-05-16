import { Selector } from 'testcafe'

import { dataValues, urbanstatsFixture } from './test_utils'

const pollutionTag = 'FGeQWrY52z2nuK'

async function goToExtremeArticle(t: TestController): Promise<void> {
    // ensure there's only one element with class 'for-testing-table-row'
    const rows = Selector('.for-testing-table-row')
    await t.expect(await rows.count).eql(1)
    while (true) {
        const editableContent = Selector('.editable_content')
        await t.click(editableContent)
        await t.pressKey('ctrl+a delete')
        await t.typeText(editableContent, '-1')
        await t.pressKey('enter')
        await t.wait(1000)
        const lastButton = Selector('button[data-test-id="1"]').nth(-1)
        const isDisabled = await lastButton.hasAttribute('disabled')
        if (isDisabled) {
            break
        }
        await t.click(lastButton)
    }
}

urbanstatsFixture('pollution', `/article.html?longname=California%2C+USA&s=${pollutionTag}`)

test('pollution-not-negative-test', async (t: TestController) => {
    await goToExtremeArticle(t)
    await t.expect(await dataValues()).eql(['0'])
})
