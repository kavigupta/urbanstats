import { Selector } from 'testcafe'

import { removeFriend, restoreUser, setupMultipleFriends } from './quiz_friends_test_utils'
import { friendsText, quizFixture } from './quiz_test_utils'
import { safeReload, target } from './test_utils'

const today = 'quiz.html#date=99'

quizFixture(
    'friends renaming test',
    `${target}/${today}`,
    {},
    '',
    'desktop',
)

test('friends-renaming-after-deletion', async (t) => {
    const { state, patterns } = await setupMultipleFriends(t)
    await restoreUser(t, 'Alice', state)

    // Verify initial state: Bob, Charlie, David, Eve
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob${patterns.bob}Remove`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Delete Charlie (middle friend) - this creates a tombstone
    await removeFriend(t, 1) // Charlie is at index 1 (after Bob at 0)
    // Wait for removal to complete
    await t.expect(Selector('button').withExactText('Remove').count).eql(3, { timeout: 2000 })
    // Verify Charlie is gone
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob${patterns.bob}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Now rename Bob - should still work correctly
    const bobName = Selector('span').withAttribute('class', 'editable_content').nth(0)
    await t.click(bobName)
    await t.pressKey('ctrl+a')
    await t.typeText(bobName, 'Bob2')
    await t.pressKey('enter')
    // Wait for Bob2 to appear
    await t.expect(Selector('div').withText(/Bob2/).exists).ok({ timeout: 2000 })
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Rename David - should work correctly (not rename Eve due to wrong index)
    const davidName = Selector('span').withAttribute('class', 'editable_content').nth(1)
    await t.click(davidName)
    await t.pressKey('ctrl+a')
    await t.typeText(davidName, 'David2')
    await t.pressKey('enter')
    // Wait for David2 to appear and verify Bob2 is still there
    await t.expect(Selector('div').withText(/David2/).exists).ok({ timeout: 2000 })
    await t.expect(Selector('div').withText(/Bob2/).exists).ok() // Verify Bob2 didn't get renamed
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `David2${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Rename Eve - should work correctly
    const eveName = Selector('span').withAttribute('class', 'editable_content').nth(2)
    await t.click(eveName)
    await t.pressKey('ctrl+a')
    await t.typeText(eveName, 'Eve2')
    await t.pressKey('enter')
    // Wait for Eve2 to appear
    await t.expect(Selector('div').withText(/Eve2/).exists).ok({ timeout: 2000 })
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `David2${patterns.david}Remove`, `Eve2${patterns.eve}Remove`])

    // Verify renames persist after reload
    await safeReload(t)
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `David2${patterns.david}Remove`, `Eve2${patterns.eve}Remove`])
})

test('friends-renaming-after-multiple-deletions', async (t) => {
    const { state, patterns } = await setupMultipleFriends(t)
    await restoreUser(t, 'Alice', state)

    // Delete Bob (first friend)
    await removeFriend(t, 0)
    await t.expect(Selector('button').withExactText('Remove').count).eql(3, { timeout: 2000 })
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Delete David (middle friend after Bob is gone)
    await removeFriend(t, 1) // David is now at index 1 (after Charlie at 0)
    await t.expect(Selector('button').withExactText('Remove').count).eql(2, { timeout: 2000 })
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Charlie${patterns.charlie}Remove`, `Eve${patterns.eve}Remove`])

    // Rename Charlie - should work correctly
    const charlieName = Selector('span').withAttribute('class', 'editable_content').nth(0)
    await t.click(charlieName)
    await t.pressKey('ctrl+a')
    await t.typeText(charlieName, 'Charlie2')
    await t.pressKey('enter')
    await t.expect(Selector('div').withText(/Charlie2/).exists).ok({ timeout: 2000 })
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Charlie2${patterns.charlie}Remove`, `Eve${patterns.eve}Remove`])

    // Rename Eve - should work correctly (not rename Charlie2 due to wrong index)
    const eveName = Selector('span').withAttribute('class', 'editable_content').nth(1)
    await t.click(eveName)
    await t.pressKey('ctrl+a')
    await t.typeText(eveName, 'Eve2')
    await t.pressKey('enter')
    await t.expect(Selector('div').withText(/Eve2/).exists).ok({ timeout: 2000 })
    await t.expect(Selector('div').withText(/Charlie2/).exists).ok() // Verify Charlie2 didn't get renamed
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Charlie2${patterns.charlie}Remove`, `Eve2${patterns.eve}Remove`])

    // Verify renames persist after reload
    await safeReload(t)
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Charlie2${patterns.charlie}Remove`, `Eve2${patterns.eve}Remove`])
})

test('friends-renaming-after-deletion-first-and-last', async (t) => {
    const { state, patterns } = await setupMultipleFriends(t)
    await restoreUser(t, 'Alice', state)

    // Delete Bob (first friend)
    await removeFriend(t, 0)
    await t.expect(Selector('button').withExactText('Remove').count).eql(3, { timeout: 2000 })
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Delete Eve (last friend)
    await removeFriend(t, 2) // Eve is now at index 2 (after Charlie at 0, David at 1)
    await t.expect(Selector('button').withExactText('Remove').count).eql(2, { timeout: 2000 })
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`])

    // Rename Charlie - should work correctly
    const charlieName = Selector('span').withAttribute('class', 'editable_content').nth(0)
    await t.click(charlieName)
    await t.pressKey('ctrl+a')
    await t.typeText(charlieName, 'Charlie2')
    await t.pressKey('enter')
    await t.expect(Selector('div').withText(/Charlie2/).exists).ok({ timeout: 2000 })
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Charlie2${patterns.charlie}Remove`, `David${patterns.david}Remove`])

    // Rename David - should work correctly (not rename Charlie2)
    const davidName = Selector('span').withAttribute('class', 'editable_content').nth(1)
    await t.click(davidName)
    await t.pressKey('ctrl+a')
    await t.typeText(davidName, 'David2')
    await t.pressKey('enter')
    await t.expect(Selector('div').withText(/David2/).exists).ok({ timeout: 2000 })
    await t.expect(Selector('div').withText(/Charlie2/).exists).ok() // Verify Charlie2 didn't get renamed
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Charlie2${patterns.charlie}Remove`, `David2${patterns.david}Remove`])

    // Verify renames persist after reload
    await safeReload(t)
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Charlie2${patterns.charlie}Remove`, `David2${patterns.david}Remove`])
})
