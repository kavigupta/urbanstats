import { Selector } from 'testcafe'

import { safeReload } from './test_utils'

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
    await t.eval(() => {
        window.localStorage.clear()
    })
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
    const friendIDField = Selector('input').withAttribute('placeholder', 'Friend ID')
    await t.click(friendIDField)
    await t.pressKey('ctrl+a delete')
    if (friendID !== '') {
        await t.typeText(friendIDField, friendID)
    }
    await t.click(Selector('button').withText('Add'))
}

export async function removeFriend(t: TestController, nth: number): Promise<void> {
    await t.click(Selector('button').withText('Remove').nth(nth))
}
