import { quiz_fixture, click_buttons, quiz_screencap } from './quiz_test_utils'
import { TARGET } from './test_utils'

quiz_fixture(
    'basic friends test',
    `${TARGET}/quiz.html#date=99`,
    { },
    '',
)

interface JuxtastatUserState {
    currentUser?: string
    allUserState: Map<string, object>
}

async function switch_away_from_user(t: TestController, state: JuxtastatUserState): Promise<void> {
    if (state.currentUser === undefined) {
        return
    }
    const localStorage = await t.eval(() => {
        return JSON.parse(JSON.stringify(window.localStorage)) as object
    }) as object
    state.allUserState.set(state.currentUser, localStorage)
    await t.eval(() => {
        window.localStorage.clear()
    })
    state.currentUser = undefined
}

async function create_user(t: TestController, user: string, userId: string, state: JuxtastatUserState): Promise<void> {
    await switch_away_from_user(t, state)
    await t.expect(state.currentUser).eql(undefined)
    await t.expect(state.allUserState.has(user)).eql(false)
    await t.eval(() => {
        localStorage.setItem('user_id', userId)
    }, { dependencies: { userId } })
    // reload
    await t.eval(() => {
        // eslint-disable-next-line no-restricted-syntax -- Localstorage is not reactive
        window.location.reload()
    })
}

function starting_state(): JuxtastatUserState {
    return {
        currentUser: undefined,
        allUserState: new Map(),
    }
}

test('quiz-clickthrough-test', async (t) => {
    const state = starting_state()
    await create_user(t, 'Alice', '000000a', state)
    await click_buttons(t, ['a', 'a', 'a', 'a', 'a'])
    await quiz_screencap(t)
})
