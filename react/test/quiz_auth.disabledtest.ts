import { Selector } from 'testcafe'

import { corruptTokens, email, quizAuthFixture, signInLink, signOutLink, urbanStatsGoogleSignIn, waitForSync } from './quiz_auth_test_utils'
import { addFriend, createUser, removeFriend, restoreUser, startingState } from './quiz_friends_test_utils'
import { exampleQuizHistory } from './quiz_test_template'
import { clickButtons, friendsText, withMockedClipboard } from './quiz_test_utils'
import { safeClearLocalStorage, safeReload, target } from './test_utils'

// eslint-disable-next-line no-restricted-syntax -- This is the one file
quizAuthFixture('existing state', `${target}/quiz.html#enableAuth=true`, {
    quiz_history: JSON.stringify(exampleQuizHistory(600, 650)),
}, '', 'desktop')

test('sign in to google, clear local storage, sign in again, syncs', async (t) => {
    await urbanStatsGoogleSignIn(t)
    await t.expect(signOutLink.exists).ok()
    await t.expect(Selector('div').withText(`Signed in with ${email}.`).exists).ok()

    await t.click(signOutLink)
    await safeClearLocalStorage(t)
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
    await safeClearLocalStorage(t)
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

test(`friends with email`, async (t) => {
    const state = startingState()
    // Alice and Bob are linked together
    await createUser(t, 'Alice', '0a', state)
    await urbanStatsGoogleSignIn(t)
    await createUser(t, 'Bob', '0b', state)
    await urbanStatsGoogleSignIn(t)

    // Charlie adds Alice
    await createUser(t, 'Charlie', '0c', state)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a']) // 3 / 5
    await addFriend(t, 'Alice', email)
    await t.expect(friendsText()).eql([
        'YounynyyCopy Link',
        'AliceAsk\u00a0Alice\u00a0to add youRemove',
    ])

    // But Bob completes the quiz, adds charlie
    await restoreUser(t, 'Bob', state)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await clickButtons(t, ['b', 'b', 'b', 'b', 'b']) // 2 / 5
    await addFriend(t, 'Charlie', '0c')

    // Bob can see charlie's score
    await t.expect(friendsText()).eql([
        'YouynynnCopy Link',
        'CharlienynyyRemove',
    ])
    await waitForSync(t)

    // Charlie should see bob's score
    await restoreUser(t, 'Charlie', state)
    await t.expect(friendsText()).eql([
        'YounynyyCopy Link',
        'AliceynynnRemove',
    ])
})

const friendEmailLinkHash = '#name=spudwaffle&id=urban.stats.test%40pavonine.co'
const friendEmailLink = `https://juxtastat.org/${friendEmailLinkHash}`

test('copy friend email link', async (t) => {
    await urbanStatsGoogleSignIn(t)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await t.setNativeDialogHandler(() => 'spudwaffle')
    const copies = await withMockedClipboard(t, async () => {
        await t.click('[data-test-id=friend-link-button]')
    })
    await t.expect(await t.getNativeDialogHistory()).eql([
        {
            text: 'Link copied to clipboard!',
            type: 'alert',
            url: 'http://localhost:8000/quiz.html#date=650',
        },
        {
            text: 'Enter your name:',
            type: 'prompt',
            url: 'http://localhost:8000/quiz.html#date=650',
        },
    ])
    await t.expect(copies).eql([friendEmailLink])
})

test('paste friend email link', async (t) => {
    await t.setNativeDialogHandler(() => true)
    await t.navigateTo(`${target}/quiz.html${friendEmailLinkHash}&date=650`)
    await t.expect(await t.getNativeDialogHistory()).eql([
        {
            text: 'Friend added: spudwaffle !',
            type: 'alert',
            url: 'http://localhost:8000/quiz.html#date=650',
        },
    ])
    const friends = await friendsText()
    await t.expect(friends.length).eql(2)
    await t.expect(friends[1]).eql('spudwaffleAsk\u00a0spudwaffle\u00a0to add youRemove')
})

// eslint-disable-next-line no-restricted-syntax -- This is the one file
quizAuthFixture('no state', `${target}/quiz.html#enableAuth=true`, {}, '', 'desktop')

test('sync quiz progress two devices', async (t) => {
    const state = startingState()
    await createUser(t, 'Alice', '0a', state)
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    await urbanStatsGoogleSignIn(t)
    await t.expect(Selector('div').withExactText('1\nPlayed').exists).ok()
    await createUser(t, 'Bob', '0b', state)
    await urbanStatsGoogleSignIn(t)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    await t.navigateTo(`${target}/quiz.html`)
    await t.expect(Selector('div').withExactText('2\nPlayed').exists).ok()
    await waitForSync(t)
    await restoreUser(t, 'Alice', state)
    await waitForSync(t)
    await t.expect(Selector('div').withExactText('2\nPlayed').exists).ok()
})

test('sync friends two devices', async (t) => {
    const state = startingState()
    await createUser(t, 'Alice', '0a', state)
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    await addFriend(t, 'Charlie', '0c')
    await urbanStatsGoogleSignIn(t)
    await t.expect(Selector('b').withExactText('Charlie').exists).ok()
    await t.navigateTo(target) // So quiz stuff isn't loaded and we aren't watching as we create user
    await createUser(t, 'Bob', '0b', state)
    await t.navigateTo(`${target}/quiz.html`)
    await clickButtons(t, ['b', 'b', 'b', 'b', 'b'])
    await urbanStatsGoogleSignIn(t)
    await t.expect(Selector('b').withExactText('Charlie').exists).ok()
    await addFriend(t, 'Darlene', '0d')
    await waitForSync(t)
    await restoreUser(t, 'Alice', state)
    await waitForSync(t)
    await t.expect(Selector('b').withExactText('Charlie').exists).ok()
    await t.expect(Selector('b').withExactText('Darlene').exists).ok()

    await removeFriend(t, 1)
    await waitForSync(t)
    await restoreUser(t, 'Bob', state)
    await waitForSync(t)
    await t.expect(Selector('b').withExactText('Darlene').exists).notOk()
})

test('merge lowest score', async (t) => {
    const state = startingState()
    await createUser(t, 'Alice', '0a', state)
    // Play and get a low score
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a']) // 3 / 5
    await t.expect(Selector('div').withExactText('🟥🟩🟥🟩🟩').exists).ok()
    await urbanStatsGoogleSignIn(t)

    // Simulate playing on another device with a higher score
    await createUser(t, 'Bob', '0b', state)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await clickButtons(t, ['b', 'b', 'b', 'b', 'b']) // 2 / 5
    await t.expect(Selector('div').withExactText('🟩🟥🟩🟥🟥').exists).ok()
    await urbanStatsGoogleSignIn(t)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await t.expect(Selector('div').withExactText('🟩🟥🟩🟥🟥').exists).ok()

    // Restore original user and check merged score is the lowest
    await restoreUser(t, 'Alice', state)
    await waitForSync(t)
    await t.expect(Selector('div').withExactText('🟩🟥🟩🟥🟥').exists).ok()
})

test(`friends with associated pair of ids`, async (t) => {
    const state = startingState()
    // Alice and Bob are linked together
    await createUser(t, 'Alice', '0a', state)
    await urbanStatsGoogleSignIn(t)
    await createUser(t, 'Bob', '0b', state)
    await urbanStatsGoogleSignIn(t)

    // Charlie adds Alice
    await createUser(t, 'Charlie', '0c', state)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a']) // 3 / 5
    await addFriend(t, 'Alice', '0a')
    await t.expect(friendsText()).eql([
        'YounynyyCopy Link',
        'AliceAsk\u00a0Alice\u00a0to add youRemove',
    ])

    // But Bob completes the quiz, adds charlie
    await restoreUser(t, 'Bob', state)
    await t.navigateTo(`${target}/quiz.html#date=650`)
    await clickButtons(t, ['b', 'b', 'b', 'b', 'b']) // 2 / 5
    await addFriend(t, 'Charlie', '0c')

    // Bob can see charlie's score
    await t.expect(friendsText()).eql([
        'YouynynnCopy Link',
        'CharlienynyyRemove',
    ])
    await waitForSync(t)

    // Charlie should see bob's score
    await restoreUser(t, 'Charlie', state)
    await t.expect(friendsText()).eql([
        'YounynyyCopy Link',
        'AliceynynnRemove',
    ])
})
