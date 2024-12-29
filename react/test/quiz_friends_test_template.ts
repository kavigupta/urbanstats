import { Selector } from 'testcafe'

import { quizFixture, clickButtons, quizScreencap, friendsText } from './quiz_test_utils'
import { safeReload, target } from './test_utils'

type Storage = Record<string, string>

interface JuxtastatUserState {
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

async function createUser(t: TestController, user: string, userId: string, state: JuxtastatUserState): Promise<void> {
    await switchAwayFromUser(t, state)
    await t.expect(state.allUserState.has(user)).eql(false)
    await t.eval(() => {
        localStorage.setItem('persistent_id', userId)
    }, { dependencies: { userId } })
    await safeReload(t)
    state.currentUser = user
}

async function restoreUser(t: TestController, user: string, state: JuxtastatUserState): Promise<void> {
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

function startingState(): JuxtastatUserState {
    return {
        currentUser: undefined,
        allUserState: new Map(),
    }
}

async function addFriend(t: TestController, friendName: string, friendID: string): Promise<void> {
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

async function removeFriend(t: TestController, nth: number): Promise<void> {
    await t.click(Selector('button').withText('Remove').nth(nth))
}

function toBobPattern(alicePattern: string): string {
    return alicePattern.split('').map((c: string) => (c === 'y' ? 'n' : 'y')).join('')
}

function toCharliePattern(alicePattern: string): string {
    const bobPattern = toBobPattern(alicePattern)
    return alicePattern[0] + bobPattern[1] + alicePattern[2] + bobPattern[3] + alicePattern[4]
}

export function quizFriendsTest(
    props: {
        name: string
        alicePattern: string
        alicePatternPrev: string
        aliceOtherPattern: string
        today: string
        yesterday: string
        other: string
        platform: 'desktop' | 'mobile'
    },
): void {
    const {
        alicePattern,
        alicePatternPrev,
        aliceOtherPattern,
        today,
        yesterday,
        other,
    } = props

    const bobPattern = toBobPattern(alicePattern)
    const charliePattern = toCharliePattern(alicePattern)
    const charliePatternPrev = toCharliePattern(alicePatternPrev)

    quizFixture(
        `${props.name} friends test`,
        `${target}/${today}`,
        { },
        '',
        async (t) => {
            switch (props.platform) {
                case 'mobile':
                    await t.resizeWindow(400, 800)
                    break
                case 'desktop':
                    await t.resizeWindow(1400, 800)
                    break
            }
        },
    )

    async function aliceBobFriends(t: TestController, screenshots: boolean): Promise<JuxtastatUserState> {
        const state = startingState()
        // Alice does the quiz
        await createUser(t, 'Alice', '000000a', state)
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`])
        await createUser(t, 'Bob', '000000b', state)
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

    test(`${props.name}-basic-friends-test`, async (t) => {
        const state = await aliceBobFriends(t, true)
        // Charlie hasn't done the quiz yet (they register on #98 instead)
        await createUser(t, 'Charlie', '000000c', state)
        await t.navigateTo(`${target}/${yesterday}`)
        await clickButtons(t, ['a', 'b', 'a', 'b', 'a'])
        await addFriend(t, 'Alice', '000000a')
        await t.expect(friendsText()).eql([`You${charliePatternPrev}Copy Link`, 'AliceAsk\u00a0Alice\u00a0to add youRemove'])
        await restoreUser(t, 'Alice', state)
        await t.navigateTo(`${target}/${today}`)
        await addFriend(t, 'Charlie', '000000c')
        // Alice and Charlie are now friends
        await quizScreencap(t) // screencap of friend who hasn't done the quiz yet
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Bob${bobPattern}Remove`, 'CharlieNot Done YetRemove'])
        // Charlie now does the quiz
        await restoreUser(t, 'Charlie', state)
        await clickButtons(t, ['a', 'b', 'a', 'b', 'a'])
        await t.expect(friendsText()).eql([`You${charliePattern}Copy Link`, `Alice${alicePattern}Remove`])
        await restoreUser(t, 'Alice', state)
        await quizScreencap(t) // multiple friends who have done the quiz
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Bob${bobPattern}Remove`, `Charlie${charliePattern}Remove`])
        // Alice unfriends Bob
        await removeFriend(t, 0)
        // wait until there's only one Remove button. up to 1 second
        await t.expect(Selector('button').withText('Remove').count).eql(1, { timeout: 1000 })
        await quizScreencap(t) // unfriended Bob
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Charlie${charliePattern}Remove`])
        // Bob no longer sees Alice's score
        await restoreUser(t, 'Bob', state)
        await quizScreencap(t) // Bob no longer sees Alice's score
        await t.expect(friendsText()).eql([`You${bobPattern}Copy Link`, 'AliceAsk\u00a0Alice\u00a0to add youRemove'])
        // rename Alice to Alice2 by clicking on the Alice name and changing it
        const aliceName = Selector('span').withAttribute('class', 'editable_content').nth(0)
        await t.click(aliceName)
        await t.pressKey('ctrl+a')
        await t.typeText(aliceName, 'Alice2')
        await t.pressKey('enter')
        await t.expect(friendsText()).eql([`You${bobPattern}Copy Link`, 'Alice2Ask\u00a0Alice2\u00a0to add youRemove'])
        await safeReload(t)
        await t.wait(1000)
        await t.expect(friendsText()).eql([`You${bobPattern}Copy Link`, 'Alice2Ask\u00a0Alice2\u00a0to add youRemove'])
    })

    test(`${props.name}-friends-bad-naming-test`, async (t) => {
        const state = await aliceBobFriends(t, false)
        await restoreUser(t, 'Alice', state)
        // should error because we are attempting to add the same user under a different name
        await addFriend(t, 'Bob2', '000000b')
        // Bob2 not added
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Bob${bobPattern}Remove`])
        // check that the text 'Friend ID 000000b already exists as Bob' is displayed
        await t.expect(Selector('div').withText('Friend ID 000000b already exists as Bob').exists).ok()
        // should error because we are attempting to add a duplicate name
        await addFriend(t, 'Bob', 'abc')
        // Bob not added
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Bob${bobPattern}Remove`])
        // check that the text 'Friend Name Bob already exists' is displayed
        await t.expect(Selector('div').withText('Friend name already exists').exists).ok()
        // should error because we are attempting to add an empty name
        await addFriend(t, '', 'abc')
        // empty name not added
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Bob${bobPattern}Remove`])
        // check that the text 'Friend name cannot be empty' is displayed
        await t.expect(Selector('div').withText('Friend name cannot be empty').exists).ok()
        // should error because we are attempting to add an empty ID
        await addFriend(t, 'Bob2', '')
        // empty ID not added
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Bob${bobPattern}Remove`])
        // check that the text 'Friend ID cannot be empty' is displayed
        await t.expect(Selector('div').withText('Friend ID cannot be empty').exists).ok()
        // add an additional friend
        await addFriend(t, 'Charlie', '000000c')
        // Charlie added
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Bob${bobPattern}Remove`, 'CharlieAsk\u00a0Charlie\u00a0to add youRemove'])
        // attempting to rename Charlie to Bob should error
        const charlieName = Selector('span').withAttribute('class', 'editable_content').nth(1)
        await t.click(charlieName)
        await t.pressKey('ctrl+a')
        await t.typeText(charlieName, 'Bob')
        await t.pressKey('enter')
        // Charlie not renamed
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Bob${bobPattern}Remove`, 'CharlieAsk\u00a0Charlie\u00a0to add youRemove'])
        // check that the text 'Friend name already exists' is displayed
        await t.expect(Selector('div').withText('Friend name already exists').exists).ok()
    })

    test(`${props.name}-friends-invalid-id`, async (t) => {
        const state = await aliceBobFriends(t, false)
        await restoreUser(t, 'Alice', state)
        await addFriend(t, 'Bob2', 'this id does not work')
        // Bob2 added but shows up as an invalid user
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Bob${bobPattern}Remove`, 'Bob2Invalid User IDRemove'])
        // after a reload, same invalid user
        await safeReload(t)
        await t.wait(1000)
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Bob${bobPattern}Remove`, 'Bob2Invalid User IDRemove'])
        await addFriend(t, 'Bob3', '000000b   ')
        // duplicate error
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, `Bob${bobPattern}Remove`, 'Bob2Invalid User IDRemove'])
        await t.expect(Selector('div').withText('Friend ID 000000b already exists as Bob').exists).ok()
        // remove Bob
        await removeFriend(t, 0)
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, 'Bob2Invalid User IDRemove'])
        // add Bob3
        await addFriend(t, 'Bob3', '000000b    ')
        // Bob3 added
        await t.expect(friendsText()).eql([`You${alicePattern}Copy Link`, 'Bob2Invalid User IDRemove', `Bob3${bobPattern}Remove`])
    })

    test(`${props.name}-same-on-juxta-and-retro`, async (t) => {
        await aliceBobFriends(t, false)
        // same on retrostat
        await t.navigateTo(`${target}/${other}`)
        await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
        await t.expect(friendsText()).eql([`You${aliceOtherPattern}Copy Link`, 'BobNot Done YetRemove'])
    })
}
