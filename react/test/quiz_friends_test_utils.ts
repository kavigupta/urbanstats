import { Selector } from 'testcafe'

import { clickButtons, friendsText, quizScreencap } from './quiz_test_utils'
import { safeClearLocalStorage, safeReload } from './test_utils'

type Storage = Record<string, string>

export interface JuxtastatUserState {
    currentUser?: string
    allUserState: Map<string, Storage>
}

async function switchAwayFromUser(t: TestController, state: JuxtastatUserState): Promise<void> {
    if (state.currentUser !== undefined) {
        const localStorage = await t.eval(() => {
            return JSON.parse(JSON.stringify(window.localStorage)) as object
        }) as object
        // await t.expect(localStorage.hasOwnProperty('persistent_id')).eql(true)
        state.allUserState.set(state.currentUser, localStorage as Storage)
    }
    await safeClearLocalStorage(t)
    state.currentUser = undefined
}

export async function createUser(t: TestController, user: string, userId: string, state: JuxtastatUserState): Promise<void> {
    await switchAwayFromUser(t, state)
    await t.expect(state.allUserState.has(user)).eql(false)
    await t.eval(() => {
        localStorage.setItem('persistent_id', userId)
    }, { dependencies: { userId } })
    await safeReload(t)
    state.currentUser = user
}

export async function restoreUser(t: TestController, user: string, state: JuxtastatUserState): Promise<void> {
    await switchAwayFromUser(t, state)
    await t.expect(state.allUserState.has(user)).eql(true)
    const storage = state.allUserState.get(user)!
    await t.eval(() => {
        for (const key of Object.keys(storage)) {
            localStorage.setItem(key, storage[key])
        }
    }, { dependencies: { storage } })
    await safeReload(t)
    state.currentUser = user
}

export function startingState(): JuxtastatUserState {
    return {
        currentUser: undefined,
        allUserState: new Map(),
    }
}

export async function addFriend(t: TestController, friendName: string, friendID: string): Promise<void> {
    const friendNameField = Selector('input', { timeout: 1000 }).withAttribute('placeholder', 'Friend Name')
    await t.click(friendNameField)
    // clear the field
    await t.pressKey('ctrl+a delete')
    if (friendName !== '') {
        await t.typeText(friendNameField, friendName)
    }
    const friendIDField = Selector('input[placeholder="Friend ID or Email"]')
    await t.click(friendIDField)
    await t.pressKey('ctrl+a delete')
    if (friendID !== '') {
        await t.typeText(friendIDField, friendID)
    }
    await t.click(Selector('button').withExactText('Add'))
}

export async function removeFriend(t: TestController, nth: number): Promise<void> {
    await t.click(Selector('button').withExactText('Remove').nth(nth))
}

export async function makeAliceBobFriends(t: TestController, screenshots: boolean, alicePattern: string, bobPattern: string, startState: JuxtastatUserState | undefined): Promise<JuxtastatUserState> {
    const state = startState ?? startingState()
    // Alice does the quiz
    if (!state.allUserState.has('Alice')) {
        await createUser(t, 'Alice', '000000a', state)
    }
    else {
        await restoreUser(t, 'Alice', state)
    }
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`])
    if (!state.allUserState.has('Bob')) {
        await createUser(t, 'Bob', '000000b', state)
    }
    else {
        await restoreUser(t, 'Bob', state)
    }
    await clickButtons(t, ['b', 'b', 'b', 'b', 'b'])
    await t.expect(friendsText()).eql([`You${bobPattern}Copy Link`])
    await addFriend(t, 'Alice', '000000a')
    if (screenshots) {
        await quizScreencap(t) // screencap of pending friend request
    }
    await t.expect(friendsText()).eql([`You${bobPattern}Copy Link`, 'AliceAsk\u00a0Alice\u00a0to add youRemove'])
    await restoreUser(t, 'Alice', state)
    await addFriend(t, 'Bob', '000000b')
    // Alice and Bob are now friends
    if (screenshots) {
        await quizScreencap(t) // screencap of friends' score
    }
    await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Bob${bobPattern}Remove`])
    return state
}

export interface FriendPatterns {
    alice: string
    bob: string
    charlie: string
    david: string
    eve: string
}

export async function setupMultipleFriends(t: TestController): Promise<{ state: JuxtastatUserState, patterns: FriendPatterns }> {
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
