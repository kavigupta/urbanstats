import { Selector } from 'testcafe'

import { clickButtons, quizFixture } from './quiz_test_utils'
import { getLocation, target } from './test_utils'

quizFixture('buttons to other quizzes on juxta completion', `${target}/quiz.html`, {}, '', 'mobile')

test('navigate around quizzes', async (t) => {
    await clickButtons(t, ['a', 'b', 'a', 'b', 'a'])

    const juxtaButton = Selector('a').withExactText('Play Juxtastat')
    const retroButton = Selector('a').withExactText('Play Retrostat')
    const infiniteButton = Selector('a').withExactText('Play Juxtastat Infinite')

    await t.expect(juxtaButton.exists).notOk()
    await t.expect(retroButton.exists).ok()
    await t.expect(infiniteButton.exists).ok()

    await t.click(retroButton)
    await t.expect(getLocation()).contains('/quiz.html#mode=retro')

    await clickButtons(t, ['a', 'b', 'a', 'b', 'a'])

    await t.expect(juxtaButton.exists).notOk()
    await t.expect(retroButton.exists).notOk()
    await t.expect(infiniteButton.exists).ok()

    // Navigate back to juxta, should not show retro button
    await t.navigateTo('/quiz.html')

    await t.expect(juxtaButton.exists).notOk()
    await t.expect(retroButton.exists).notOk()
    await t.expect(infiniteButton.exists).ok()

    await t.click(infiniteButton)

    // Eventually fail the infinite quiz
    await clickButtons(t, Array<string>(100).fill('a')).catch(() => undefined)

    await t.expect(juxtaButton.exists).notOk()
    await t.expect(retroButton.exists).notOk()
    await t.expect(infiniteButton.exists).notOk()
})
