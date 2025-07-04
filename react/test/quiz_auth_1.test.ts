import { Selector } from 'testcafe'

import { corruptTokens, email, quizAuthFixture, signInLink, signOutLink, urbanStatsGoogleSignIn } from './quiz_auth_test_utils'
import { exampleQuizHistory } from './quiz_test_template'
import { safeClearLocalStorage, safeReload, target } from './test_utils'

quizAuthFixture('existing state', `${target}/quiz.html`, {
    quiz_history: JSON.stringify(exampleQuizHistory(600, 650)),
}, '', 'desktop')

test('sign in to google, clear local storage, sign in again, syncs', async (t) => {
    await urbanStatsGoogleSignIn(t)
    await t.expect(signOutLink.exists).ok()
    await t.expect(Selector('div').withText(`Signed in with ${email}.`).exists).ok()

    await t.click(signOutLink)
    await safeClearLocalStorage()
    await safeReload(t)
    await t.expect(signInLink.exists).ok()
    await urbanStatsGoogleSignIn(t)
    await t.navigateTo(`${target}/quiz.html#date=650`)

    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
})

test('sign in to google, corrupt tokens, should require sign in, and can sign in again', async (t) => {
    await urbanStatsGoogleSignIn(t)
    await corruptTokens(t)
    await urbanStatsGoogleSignIn(t)
    await t.expect(Selector('div').withText(`Signed in with ${email}.`).exists).ok()
})

test('sign in to google, corrupt tokens, choose to sign out, quiz history is maintained', async (t) => {
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
    await t.expect(signInLink.count).eql(2) // Nag banner
    await urbanStatsGoogleSignIn(t)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
    await corruptTokens(t)
    await t.click(Selector('button').withExactText('Sign Out'))
    // Quiz history should still be present
    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
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
    await safeClearLocalStorage()
    await safeReload(t)
    await t.expect(signInLink.exists).ok()
    await t.expect(signOutLink.exists).notOk()
})

test('sign in to google, sign out, quiz history is maintained, sign in again, quiz history is still maintained', async (t) => {
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
    await t.expect(signInLink.count).eql(2) // Nag banner
    await t.click('div[title="Dismiss"]')
    await urbanStatsGoogleSignIn(t)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
    await t.click(signOutLink)
    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
    await t.expect(signInLink.count).eql(1) // No Nag banner
    await urbanStatsGoogleSignIn(t)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await t.expect(Selector('div').withExactText('51\nPlayed').exists).ok()
})
