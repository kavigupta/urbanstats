import { Selector } from 'testcafe'

import { quiz_fixture, click_buttons, quiz_screencap } from './quiz_test_utils'
import { TARGET } from './test_utils'

type Storage = Record<string, string>

interface JuxtastatUserState {
    currentUser?: string
    allUserState: Map<string, Storage>
}

async function switch_away_from_user(t: TestController, state: JuxtastatUserState): Promise<void> {
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

async function create_user(t: TestController, user: string, userId: string, state: JuxtastatUserState): Promise<void> {
    await switch_away_from_user(t, state)
    await t.expect(state.allUserState.has(user)).eql(false)
    await t.eval(() => {
        localStorage.setItem('persistent_id', userId)
    }, { dependencies: { userId } })
    // reload
    await t.eval(() => {
        // eslint-disable-next-line no-restricted-syntax -- Localstorage is not reactive
        window.location.reload()
    })
    state.currentUser = user
}

async function restore_user(t: TestController, user: string, state: JuxtastatUserState): Promise<void> {
    await switch_away_from_user(t, state)
    await t.expect(state.allUserState.has(user)).eql(true)
    const storage = state.allUserState.get(user)!
    await t.eval(() => {
        for (const key of Object.keys(storage)) {
            localStorage.setItem(key, storage[key])
        }
    }, { dependencies: { storage } })
    // reload
    await t.eval(() => {
        // eslint-disable-next-line no-restricted-syntax -- Localstorage is not reactive
        window.location.reload()
    })
    state.currentUser = user
}

function starting_state(): JuxtastatUserState {
    return {
        currentUser: undefined,
        allUserState: new Map(),
    }
}

async function friendsText(t: TestController): Promise<string[]> {
    return await t.eval(() => {
        const elements = document.getElementsByClassName('testing-friends-section')
        const results: string[] = []
        // eslint-disable-next-line @typescript-eslint/prefer-for-of -- No need to convert to array
        for (let i = 0; i < elements.length; i++) {
            results.push(elements[i].textContent!)
        }
        return results
    }) as string[]
}

async function addFriend(t: TestController, friendName: string, friendID: string): Promise<void> {
    const friendNameField = Selector('input').withAttribute('placeholder', 'Friend Name')
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

async function removeFriend(t: TestController, nth: number): Promise<void> {
    await t.click(Selector('button').withText('Remove').nth(nth))
}

quiz_fixture(
    'basic friends test',
    `${TARGET}/quiz.html#date=99`,
    { },
    '',
)

async function aliceBobFriends(t: TestController, screenshots: boolean): Promise<JuxtastatUserState> {
    const state = starting_state()
    // Alice does the quiz
    await create_user(t, 'Alice', '000000a', state)
    await click_buttons(t, ['a', 'a', 'a', 'a', 'a'])
    await t.expect(await friendsText(t)).eql(['Youyyyyn'])
    await create_user(t, 'Bob', '000000b', state)
    await click_buttons(t, ['b', 'b', 'b', 'b', 'b'])
    await t.expect(await friendsText(t)).eql(['Younnnny'])
    await addFriend(t, 'Alice', '000000a')
    if (screenshots) {
        await quiz_screencap(t) // screencap of pending friend request
    }
    await t.expect(await friendsText(t)).eql(['Younnnny', 'AlicePending Friend RequestRemove'])
    await restore_user(t, 'Alice', state)
    await addFriend(t, 'Bob', '000000b')
    // Alice and Bob are now friends
    if (screenshots) {
        await quiz_screencap(t) // screencap of friends' score
    }
    await t.expect(await friendsText(t)).eql(['Youyyyyn', 'BobnnnnyRemove'])
    return state
}

test('basic-friends-test', async (t) => {
    const state = await aliceBobFriends(t, true)
    // Charlie hasn't done the quiz yet (they register on #98 instead)
    await create_user(t, 'Charlie', '000000c', state)
    await t.eval(() => {
        // eslint-disable-next-line no-restricted-syntax -- Localstorage is not reactive
        window.location.href = `${window.location.origin}/quiz.html#date=98`
    })
    await click_buttons(t, ['a', 'a', 'a', 'a', 'a'])
    await addFriend(t, 'Alice', '000000a')
    await t.expect(await friendsText(t)).eql(['Younynyy', 'AlicePending Friend RequestRemove'])
    await restore_user(t, 'Alice', state)
    await t.eval(() => {
        // eslint-disable-next-line no-restricted-syntax -- Localstorage is not reactive
        window.location.href = `${window.location.origin}/quiz.html#date=99`
    })
    await addFriend(t, 'Charlie', '000000c')
    // Alice and Charlie are now friends
    await quiz_screencap(t) // screencap of friend who hasn't done the quiz yet
    await t.expect(await friendsText(t)).eql(['Youyyyyn', 'BobnnnnyRemove', 'CharlieNot Done YetRemove'])
    // Charlie now does the quiz
    await restore_user(t, 'Charlie', state)
    await click_buttons(t, ['a', 'b', 'a', 'b', 'a'])
    await t.expect(await friendsText(t)).eql(['Youynynn', 'AliceyyyynRemove'])
    await restore_user(t, 'Alice', state)
    await quiz_screencap(t) // multiple friends who have done the quiz
    await t.expect(await friendsText(t)).eql(['Youyyyyn', 'BobnnnnyRemove', 'CharlieynynnRemove'])
    // Alice unfriends Bob
    await removeFriend(t, 0)
    // wait until there's only one Remove button. up to 1 second
    await t.expect(Selector('button').withText('Remove').count).eql(1, { timeout: 1000 })
    await quiz_screencap(t) // unfriended Bob
    await t.expect(await friendsText(t)).eql(['Youyyyyn', 'CharlieynynnRemove'])
    // Bob no longer sees Alice's score
    await restore_user(t, 'Bob', state)
    await quiz_screencap(t) // Bob no longer sees Alice's score
    await t.expect(await friendsText(t)).eql(['Younnnny', 'AlicePending Friend RequestRemove'])
    // rename Alice to Alice2 by clicking on the Alice name and changing it
    const aliceName = Selector('span').withAttribute('class', 'editable_content').nth(0)
    await t.click(aliceName)
    await t.pressKey('ctrl+a')
    await t.typeText(aliceName, 'Alice2')
    await t.pressKey('enter')
    await t.expect(await friendsText(t)).eql(['Younnnny', 'Alice2Pending Friend RequestRemove'])
    // refresh
    await t.eval(() => {
        // eslint-disable-next-line no-restricted-syntax -- Make sure changes are saved
        window.location.reload()
    })
    await t.wait(1000)
    await t.expect(await friendsText(t)).eql(['Younnnny', 'Alice2Pending Friend RequestRemove'])
})

test('friends-bad-naming-test', async (t) => {
    const state = await aliceBobFriends(t, false)
    await restore_user(t, 'Alice', state)
    // should error because we are attempting to add the same user under a different name
    await addFriend(t, 'Bob2', '000000b')
    // Bob2 not added
    await t.expect(await friendsText(t)).eql(['Youyyyyn', 'BobnnnnyRemove'])
    // check that the text 'Friend ID 000000b already exists as Bob' is displayed
    await t.expect(Selector('div').withText('Friend ID 000000b already exists as Bob').exists).ok()
    // should error because we are attempting to add a duplicate name
    await addFriend(t, 'Bob', 'abc')
    // Bob not added
    await t.expect(await friendsText(t)).eql(['Youyyyyn', 'BobnnnnyRemove'])
    // check that the text 'Friend Name Bob already exists' is displayed
    await t.expect(Selector('div').withText('Friend name already exists').exists).ok()
    // should error because we are attempting to add an empty name
    await addFriend(t, '', 'abc')
    // empty name not added
    await t.expect(await friendsText(t)).eql(['Youyyyyn', 'BobnnnnyRemove'])
    // check that the text 'Friend name cannot be empty' is displayed
    await t.expect(Selector('div').withText('Friend name cannot be empty').exists).ok()
    // should error because we are attempting to add an empty ID
    await addFriend(t, 'Bob2', '')
    // empty ID not added
    await t.expect(await friendsText(t)).eql(['Youyyyyn', 'BobnnnnyRemove'])
    // check that the text 'Friend ID cannot be empty' is displayed
    await t.expect(Selector('div').withText('Friend ID cannot be empty').exists).ok()
    // add an additional friend
    await addFriend(t, 'Charlie', '000000c')
    // Charlie added
    await t.expect(await friendsText(t)).eql(['Youyyyyn', 'BobnnnnyRemove', 'CharliePending Friend RequestRemove'])
    // attempting to rename Charlie to Bob should error
    const charlieName = Selector('span').withAttribute('class', 'editable_content').nth(1)
    await t.click(charlieName)
    await t.pressKey('ctrl+a')
    await t.typeText(charlieName, 'Bob')
    await t.pressKey('enter')
    // Charlie not renamed
    await t.expect(await friendsText(t)).eql(['Youyyyyn', 'BobnnnnyRemove', 'CharliePending Friend RequestRemove'])
    // check that the text 'Friend name already exists' is displayed
    await t.expect(Selector('div').withText('Friend name already exists').exists).ok()
})
