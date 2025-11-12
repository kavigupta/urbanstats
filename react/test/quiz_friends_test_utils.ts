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
