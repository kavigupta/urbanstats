import { Selector } from 'testcafe'

import { addFriend, createUser, JuxtastatUserState, restoreUser, startingState } from './quiz_friends_test_utils'
import { clickButtons, friendsText, quizFixture } from './quiz_test_utils'
import { safeReload, target } from './test_utils'

const today = 'quiz.html#date=99'

interface FriendPatterns {
    alice: string
    bob: string
    charlie: string
    david: string
    eve: string
}

async function setupMultipleFriends(t: TestController): Promise<{ state: JuxtastatUserState, patterns: FriendPatterns }> {
    const state = startingState()
    const patterns: FriendPatterns = {
        alice: '',
        bob: '',
        charlie: '',
        david: '',
        eve: '',
    }

    // Create Alice and do quiz
    await createUser(t, 'Alice', '000000a', state)
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    const aliceText = await friendsText()
    patterns.alice = aliceText[0].replace(/You/g, '').replace(/Copy Link/g, '')
    await t.expect(aliceText.length).eql(1)

    // Create Bob and do quiz
    await createUser(t, 'Bob', '000000b', state)
    await clickButtons(t, ['b', 'b', 'b', 'b', 'b'])
    const bobText = await friendsText()
    patterns.bob = bobText[0].replace(/You/g, '').replace(/Copy Link/g, '')
    await t.expect(bobText.length).eql(1)
    await addFriend(t, 'Alice', '000000a')
    await restoreUser(t, 'Alice', state)
    await addFriend(t, 'Bob', '000000b')
    const aliceBobText = await friendsText()
    await t.expect(aliceBobText.length).eql(2)
    await t.expect(aliceBobText[0]).contains('You')
    await t.expect(aliceBobText[1]).contains('Bob')

    // Create Charlie and do quiz
    await createUser(t, 'Charlie', '000000c', state)
    await clickButtons(t, ['a', 'b', 'a', 'b', 'a'])
    const charlieText = await friendsText()
    patterns.charlie = charlieText[0].replace(/You/g, '').replace(/Copy Link/g, '')
    await t.expect(charlieText.length).eql(1)
    await addFriend(t, 'Alice', '000000a')
    await restoreUser(t, 'Alice', state)
    await addFriend(t, 'Charlie', '000000c')
    const aliceCharlieText = await friendsText()
    await t.expect(aliceCharlieText.length).eql(3)
    await t.expect(aliceCharlieText[1]).contains('Bob')
    await t.expect(aliceCharlieText[2]).contains('Charlie')

    // Create David and do quiz
    await createUser(t, 'David', '000000d', state)
    await clickButtons(t, ['b', 'a', 'b', 'a', 'b'])
    const davidText = await friendsText()
    patterns.david = davidText[0].replace(/You/g, '').replace(/Copy Link/g, '')
    await t.expect(davidText.length).eql(1)
    await addFriend(t, 'Alice', '000000a')
    await restoreUser(t, 'Alice', state)
    await addFriend(t, 'David', '000000d')
    const aliceDavidText = await friendsText()
    await t.expect(aliceDavidText.length).eql(4)
    await t.expect(aliceDavidText[3]).contains('David')

    // Create Eve and do quiz
    await createUser(t, 'Eve', '000000e', state)
    await clickButtons(t, ['a', 'a', 'b', 'b', 'a'])
    const eveText = await friendsText()
    patterns.eve = eveText[0].replace(/You/g, '').replace(/Copy Link/g, '')
    await t.expect(eveText.length).eql(1)
    await addFriend(t, 'Alice', '000000a')
    await restoreUser(t, 'Alice', state)
    await addFriend(t, 'Eve', '000000e')
    const allFriendsText = await friendsText()
    await t.expect(allFriendsText.length).eql(5)
    await t.expect(allFriendsText[4]).contains('Eve')

    return { state, patterns }
}

quizFixture(
    'friends renaming test',
    `${target}/${today}`,
    {},
    '',
    'desktop',
)

test('friends-renaming-basic', async (t) => {
    const { state, patterns } = await setupMultipleFriends(t)
    await restoreUser(t, 'Alice', state)

    // Rename Bob to Bob2
    const bobName = Selector('span').withAttribute('class', 'editable_content').nth(0)
    await t.click(bobName)
    await t.pressKey('ctrl+a')
    await t.typeText(bobName, 'Bob2')
    await t.pressKey('enter')
    // Wait for Bob2 to appear in the friends list
    await t.expect(Selector('div').withText(/Bob2/).exists).ok({ timeout: 2000 })
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Rename Charlie to Charlie2
    const charlieName = Selector('span').withAttribute('class', 'editable_content').nth(1)
    await t.click(charlieName)
    await t.pressKey('ctrl+a')
    await t.typeText(charlieName, 'Charlie2')
    await t.pressKey('enter')
    // Wait for Charlie2 to appear and verify Bob2 is still there
    await t.expect(Selector('div').withText(/Charlie2/).exists).ok({ timeout: 2000 })
    await t.expect(Selector('div').withText(/Bob2/).exists).ok() // Verify Bob2 didn't revert
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `Charlie2${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Rename David to David2
    const davidName = Selector('span').withAttribute('class', 'editable_content').nth(2)
    await t.click(davidName)
    await t.pressKey('ctrl+a')
    await t.typeText(davidName, 'David2')
    await t.pressKey('enter')
    // Wait for David2 to appear
    await t.expect(Selector('div').withText(/David2/).exists).ok({ timeout: 2000 })
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `Charlie2${patterns.charlie}Remove`, `David2${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Rename Eve to Eve2
    const eveName = Selector('span').withAttribute('class', 'editable_content').nth(3)
    await t.click(eveName)
    await t.pressKey('ctrl+a')
    await t.typeText(eveName, 'Eve2')
    await t.pressKey('enter')
    // Wait for Eve2 to appear
    await t.expect(Selector('div').withText(/Eve2/).exists).ok({ timeout: 2000 })
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `Charlie2${patterns.charlie}Remove`, `David2${patterns.david}Remove`, `Eve2${patterns.eve}Remove`])

    // Verify renames persist after reload
    await safeReload(t)
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `Charlie2${patterns.charlie}Remove`, `David2${patterns.david}Remove`, `Eve2${patterns.eve}Remove`])
})

test('friends-renaming-empty-name', async (t) => {
    const { state, patterns } = await setupMultipleFriends(t)
    await restoreUser(t, 'Alice', state)

    // Attempt to rename Bob to empty
    const bobName = Selector('span').withAttribute('class', 'editable_content').nth(0)
    await t.click(bobName)
    await t.pressKey('ctrl+a')
    await t.pressKey('backspace')
    await t.pressKey('enter')
    // Bob not renamed
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob${patterns.bob}Remove`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])
    // Check that the text 'Friend name cannot be empty' is displayed
    await t.expect(Selector('div').withExactText('Friend name cannot be empty').exists).ok()

    // Attempt to rename Charlie to empty
    const charlieName = Selector('span').withAttribute('class', 'editable_content').nth(1)
    await t.click(charlieName)
    await t.pressKey('ctrl+a')
    await t.pressKey('backspace')
    await t.pressKey('enter')
    // Charlie not renamed
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob${patterns.bob}Remove`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])
    await t.expect(Selector('div').withExactText('Friend name cannot be empty').exists).ok()
})

test('friends-renaming-duplicate-name', async (t) => {
    const { state, patterns } = await setupMultipleFriends(t)
    await restoreUser(t, 'Alice', state)

    // Attempt to rename Charlie to Bob (duplicate)
    const charlieName = Selector('span').withAttribute('class', 'editable_content').nth(1)
    await t.click(charlieName)
    await t.pressKey('ctrl+a')
    await t.typeText(charlieName, 'Bob')
    await t.pressKey('enter')
    // Charlie not renamed
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob${patterns.bob}Remove`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])
    // Check that the text 'Friend name already exists' is displayed
    await t.expect(Selector('div').withExactText('Friend name already exists').exists).ok()

    // Rename Bob to Bob2 first
    const bobName = Selector('span').withAttribute('class', 'editable_content').nth(0)
    await t.click(bobName)
    await t.pressKey('ctrl+a')
    await t.typeText(bobName, 'Bob2')
    await t.pressKey('enter')
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Now attempt to rename Charlie to Bob (should work now)
    await t.click(charlieName)
    await t.pressKey('ctrl+a')
    await t.typeText(charlieName, 'Bob')
    await t.pressKey('enter')
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `Bob${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Attempt to rename David to Bob (duplicate again)
    const davidName = Selector('span').withAttribute('class', 'editable_content').nth(2)
    await t.click(davidName)
    await t.pressKey('ctrl+a')
    await t.typeText(davidName, 'Bob')
    await t.pressKey('enter')
    // David not renamed
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `Bob${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])
    await t.expect(Selector('div').withExactText('Friend name already exists').exists).ok()
})

test('friends-renaming-special-characters', async (t) => {
    const { state, patterns } = await setupMultipleFriends(t)
    await restoreUser(t, 'Alice', state)

    // Rename Bob to a name with spaces
    const bobName = Selector('span').withAttribute('class', 'editable_content').nth(0)
    await t.click(bobName)
    await t.pressKey('ctrl+a')
    await t.typeText(bobName, 'Bob The Builder')
    await t.pressKey('enter')
    // nbsp because this is a span, so that's how it's rendered
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob\u00A0The\u00A0Builder${patterns.bob}Remove`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Rename Charlie to a name with numbers
    const charlieName = Selector('span').withAttribute('class', 'editable_content').nth(1)
    await t.click(charlieName)
    await t.pressKey('ctrl+a')
    await t.typeText(charlieName, 'Charlie123')
    await t.pressKey('enter')
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob\u00A0The\u00A0Builder${patterns.bob}Remove`, `Charlie123${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Rename David to a very long name
    const davidName = Selector('span').withAttribute('class', 'editable_content').nth(2)
    await t.click(davidName)
    await t.pressKey('ctrl+a')
    await t.typeText(davidName, 'David With A Very Long Name That Has Many Words')
    await t.pressKey('enter')
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob\u00A0The\u00A0Builder${patterns.bob}Remove`, `Charlie123${patterns.charlie}Remove`, `David\u00A0With\u00A0A\u00A0Very\u00A0Long\u00A0Name\u00A0That\u00A0Has\u00A0Many\u00A0Words${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Verify renames persist after reload
    await safeReload(t)
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob\u00A0The\u00A0Builder${patterns.bob}Remove`, `Charlie123${patterns.charlie}Remove`, `David\u00A0With\u00A0A\u00A0Very\u00A0Long\u00A0Name\u00A0That\u00A0Has\u00A0Many\u00A0Words${patterns.david}Remove`, `Eve${patterns.eve}Remove`])
})

test('friends-renaming-stats-view', async (t) => {
    const { state, patterns } = await setupMultipleFriends(t)
    await restoreUser(t, 'Alice', state)

    // Switch to Mean Statistics view
    await t.click(Selector('button').withExactText('Mean Statistics'))

    // Rename Bob in stats view
    const bobName = Selector('span').withAttribute('class', 'editable_content').nth(0)
    await t.click(bobName)
    await t.pressKey('ctrl+a')
    await t.typeText(bobName, 'Bob2')
    await t.pressKey('enter')
    // Verify rename worked in stats view
    await t.expect(Selector('div').withText(/Bob2/).exists).ok()

    // Rename Charlie in stats view
    const charlieName = Selector('span').withAttribute('class', 'editable_content').nth(1)
    await t.click(charlieName)
    await t.pressKey('ctrl+a')
    await t.typeText(charlieName, 'Charlie2')
    await t.pressKey('enter')
    await t.expect(Selector('div').withText(/Charlie2/).exists).ok()

    // Switch back to Today view and verify renames persisted
    await t.click(Selector('button').withExactText('Today'))
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `Charlie2${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Switch back to stats view and test error cases
    await t.click(Selector('button').withExactText('Mean Statistics'))

    // Attempt to rename David to Bob2 (duplicate)
    const davidName = Selector('span').withAttribute('class', 'editable_content').nth(2)
    await t.click(davidName)
    await t.pressKey('ctrl+a')
    await t.typeText(davidName, 'Bob2')
    await t.pressKey('enter')
    // David not renamed
    await t.expect(Selector('div').withText(/David/).exists).ok()
    await t.expect(Selector('div').withExactText('Friend name already exists').exists).ok()

    // Attempt to rename Eve to empty in stats view
    const eveName = Selector('span').withAttribute('class', 'editable_content').nth(3)
    await t.click(eveName)
    await t.pressKey('ctrl+a')
    await t.pressKey('backspace')
    await t.pressKey('enter')
    // Eve not renamed
    await t.expect(Selector('div').withText(/Eve/).exists).ok()
    await t.expect(Selector('div').withExactText('Friend name cannot be empty').exists).ok()
})

test('friends-renaming-multiple-changes', async (t) => {
    const { state, patterns } = await setupMultipleFriends(t)
    await restoreUser(t, 'Alice', state)

    // Rename Bob multiple times
    const bobName = Selector('span').withAttribute('class', 'editable_content').nth(0)

    await t.click(bobName)
    await t.pressKey('ctrl+a')
    await t.typeText(bobName, 'Bob1')
    await t.pressKey('enter')
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob1${patterns.bob}Remove`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    await t.click(bobName)
    await t.pressKey('ctrl+a')
    await t.typeText(bobName, 'Bob2')
    await t.pressKey('enter')
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob2${patterns.bob}Remove`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    await t.click(bobName)
    await t.pressKey('ctrl+a')
    await t.typeText(bobName, 'Bob3')
    await t.pressKey('enter')
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob3${patterns.bob}Remove`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Rename back to original
    await t.click(bobName)
    await t.pressKey('ctrl+a')
    await t.typeText(bobName, 'Bob')
    await t.pressKey('enter')
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob${patterns.bob}Remove`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])

    // Verify final state persists after reload
    await safeReload(t)
    await t.expect(friendsText()).eql([`You${patterns.alice}Copy Link`, `Bob${patterns.bob}Remove`, `Charlie${patterns.charlie}Remove`, `David${patterns.david}Remove`, `Eve${patterns.eve}Remove`])
})
