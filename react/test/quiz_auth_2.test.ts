import { Selector } from 'testcafe'

import { quizAuthFixture, urbanStatsGoogleSignIn, waitForSync } from './quiz_auth_test_utils'
import { addFriend, createUser, removeFriend, restoreUser, startingState } from './quiz_friends_test_utils'
import { clickButtons } from './quiz_test_utils'
import { target } from './test_utils'

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
