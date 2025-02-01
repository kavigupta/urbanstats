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
    await t.expect(friendsText()).eql([`You44Copy Link`])
    // Bob does the quiz, gets a 2
    await createUser(t, 'Bob', '000000b', state)
    await provideAnswers(t, 0, '11000', 'abc')
    await t.expect(friendsText()).eql([`You22Copy Link`])
    await addFriend(t, 'Alice', '000000a')
    await quizScreencap(t) // screencap of pending friend request
    await t.expect(friendsText()).eql([`You22Copy Link`, 'AliceAsk\u00a0Alice\u00a0to add youRemove'])
    await restoreUser(t, 'Alice', state)
    await addFriend(t, 'Bob', '000000b')
    // Alice and Bob are now friends
    await quizScreencap(t) // screencap of friends' score
    await t.expect(friendsText()).eql([`You44Copy Link`, `Bob22Remove`])
})
