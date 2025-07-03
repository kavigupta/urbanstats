import { Selector } from 'testcafe'

import { dissociateUrbanStatsGoogle, email, googleSignIn, signInLink, urbanStatsGoogleSignIn } from './auth_test_utils'
import { exampleQuizHistory } from './quiz_test_template'
import { quizFixture } from './quiz_test_utils'
import { safeReload, target } from './test_utils'

const signOutLink = Selector('a').withExactText('Sign Out')

quizFixture('sign in to google', target, {
    quiz_history: JSON.stringify(exampleQuizHistory(600, 650)),
}, '', 'desktop', false)

test('sign in to google, clear local storage, sign in again, syncs', async (t) => {
    await googleSignIn(t)
    await dissociateUrbanStatsGoogle(t)
    await t.navigateTo(`${target}/quiz.html`)
    await urbanStatsGoogleSignIn(t)
    await t.navigateTo(`${target}/quiz.html`)
    await t.expect(signOutLink.exists).ok()
    await t.expect(Selector('div').withText(`Signed in with ${email}.`).exists).ok()

    await t.click(signOutLink)
    await t.eval(() => { localStorage.clear() })
    await safeReload(t)
    await t.expect(signInLink.exists).ok()
    await urbanStatsGoogleSignIn(t)
    await t.navigateTo(`${target}/quiz.html#date=650`)

    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
})
