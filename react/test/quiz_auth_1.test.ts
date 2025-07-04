import { Selector } from 'testcafe'

import { dissociateUrbanStatsGoogle, email, quizAuthFixture, signInLink, signOutLink, urbanStatsGoogleSignIn } from './auth_test_utils'
import { exampleQuizHistory } from './quiz_test_template'
import { safeReload, target } from './test_utils'

quizAuthFixture('existing state', `${target}/quiz.html`, {
    quiz_history: JSON.stringify(exampleQuizHistory(600, 650)),
}, '', 'desktop')

test('sign in to google, clear local storage, sign in again, syncs', async (t) => {
    await urbanStatsGoogleSignIn(t)
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

test('sign in to google, dissociate, try to access quiz, should require sign in, and can sign in again', async (t) => {
    await urbanStatsGoogleSignIn(t)
    await dissociateUrbanStatsGoogle(t)
    await t.expect(Selector('h1').withExactText('You were signed out').exists).ok()
    await urbanStatsGoogleSignIn(t)
    await t.expect(Selector('div').withText(`Signed in with ${email}.`).exists).ok()
})

test('sign in to google, reload page, remains signed in', async (t) => {
    await urbanStatsGoogleSignIn(t)
    await t.expect(signOutLink.exists).ok()
    await safeReload(t)
    await t.expect(signOutLink.exists).ok()
    await t.expect(Selector('div').withText(`Signed in with ${email}.`).exists).ok()
})

test('sign in to google, clear local storage, reload, should require sign in', async (t) => {
    await urbanStatsGoogleSignIn(t)
    await t.eval(() => { localStorage.clear() })
    await safeReload(t)
    await t.expect(signInLink.exists).ok()
    await t.expect(signOutLink.exists).notOk()
})

test('sign in to google, sign out, quiz history is maintained, dissociate, sign in again, quiz history is still maintained', async (t) => {
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
    await urbanStatsGoogleSignIn(t)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
    await t.click(signOutLink)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
    await dissociateUrbanStatsGoogle(t)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await urbanStatsGoogleSignIn(t)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
})

test('sign in to google, do not enable drive, should not be signed in', async (t) => {
    // Simulate Google sign-in flow without enabling Drive access
    await urbanStatsGoogleSignIn(t, { enableDrive: false })
    // User should not be signed in if Drive is not enabled
    await t.expect(signInLink.exists).ok()
    await t.expect(signOutLink.exists).notOk()
    await t.expect(Selector('div').withText(`Signed in with ${email}.`).exists).notOk()
})
