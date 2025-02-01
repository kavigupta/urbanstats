import { addFriend, createUser, restoreUser, startingState } from './quiz_friends_test_utils'
import { quizFixture, clickButtons, quizScreencap, friendsText, collectCorrectJuxtaInfiniteAnswersFixture, provideAnswers } from './quiz_test_utils'
import { safeReload, target } from './test_utils'

const seeds = ['abc', 'def']
const version = 1

collectCorrectJuxtaInfiniteAnswersFixture(seeds, version)

quizFixture(
    `infinite friends test`,
    `${target}/quiz.html?mode=infinite&seed=abc&v=${version}`,
    { },
    '',
    'desktop',
)

test(`basic-friends-test`, async (t) => {
    const state = startingState()
    // Alice does the quiz, gets a 4
    await createUser(t, 'Alice', '000000a', state)
    await provideAnswers(t, 0, '1111000', 'abc')
    await t.expect(friendsText()).eql(['On This SeedOverall Best', `You44Copy Link`])
    // Bob does the quiz, gets a 2
    await createUser(t, 'Bob', '000000b', state)
    await provideAnswers(t, 0, '11000', 'abc')
    await t.expect(friendsText()).eql(['On This SeedOverall Best', `You22Copy Link`])
    await addFriend(t, 'Alice', '000000a')
    await quizScreencap(t) // screencap of pending friend request
    await t.expect(friendsText()).eql(['On This SeedOverall Best', `You22Copy Link`, 'AliceAsk\u00a0Alice\u00a0to add youRemove'])
    await restoreUser(t, 'Alice', state)
    await addFriend(t, 'Bob', '000000b')
    // Alice and Bob are now friends
    await quizScreencap(t) // screencap of friends' score
    await t.expect(friendsText()).eql(['On This SeedOverall Best', `You44Copy Link`, `Bob22Remove`])
    await t.navigateTo(`${target}/quiz.html?mode=infinite&seed=def&v=${version}`)
    // Alice does the quiz, gets a 3
    await restoreUser(t, 'Alice', state)
    await provideAnswers(t, 0, '111000', 'def')
    await t.expect(friendsText()).eql(['On This SeedOverall Best', `You34Copy Link`, `Bob-2Remove`])
    await quizScreencap(t) // screencap of dash
    // Charlie just does a normal juxta
    await createUser(t, 'Charlie', '000000c', state)
    await t.navigateTo(`${target}/quiz.html?date=99`)
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    await addFriend(t, 'Alice', '000000a')
    await restoreUser(t, 'Alice', state)
    await t.navigateTo(`${target}/quiz.html?mode=infinite&seed=def&v=${version}`)
    await addFriend(t, 'Charlie', '000000c')
    await t.expect(friendsText()).eql(['On This SeedOverall Best', `You34Copy Link`, `Bob-2Remove`, 'Charlie--Remove'])
    await quizScreencap(t) // screencap of Charlie's lack of score
    // switch to Bob's view
    await restoreUser(t, 'Bob', state)
    await provideAnswers(t, 0, '1000', 'def')
    await t.expect(friendsText()).eql(['On This SeedOverall Best', `You12Copy Link`, `Alice34Remove`])
    await quizScreencap(t) // screencap of Bob's view of Alice's score
})
