import { Selector } from 'testcafe'

import { JuxtastatUserState, makeAliceBobFriends, restoreUser } from './quiz_friends_test_utils'
import { friendsText, quizFixture } from './quiz_test_utils'
import { screencap, target } from './test_utils'

function quizFriendsMeanStatsTestTemplate(
    props: {
        name: string
        platform: 'desktop' | 'mobile'
        isRetro: boolean
        alicePattern: string
        bobPattern: string
    },
): void {
    const today = props.isRetro ? 'quiz.html?date=1&mode=retro' : 'quiz.html?date=1'
    quizFixture(
        `${props.name} friends test`,
        `${target}/${today}`,
        {},
        '',
        'desktop',
    )

    test(`${props.name}-basic-friends-test-summary`, async (t) => {
        const quizHistoryAlice: Record<string, unknown> = {}
        const quizHistoryBob: Record<string, unknown> = {}
        for (let i = 2; i <= 50; i++) {
            const key = props.isRetro ? `W${i}` : i
            quizHistoryAlice[key] = quizHistoryBob[key] = {
                choices: ['A', 'B', 'A', 'B', 'A'],
                correct_pattern: [true, false, true, false, true],
            }
            if (i === 40) {
                quizHistoryAlice[key] = {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [false, false, false, false, true],
                }
            }
            if (i === 20) {
                quizHistoryBob[key] = {
                    choices: ['A', 'A', 'A', 'A', 'A'],
                    correct_pattern: [false, false, false, false, true],
                }
            }
        }
        const initialState: JuxtastatUserState = {
            currentUser: undefined,
            allUserState: new Map<string, Record<string, string>>([
                ['Alice', {
                    quiz_history: JSON.stringify(quizHistoryAlice),
                    secure_id: '2522ef71e8e4677',
                    testIterationId: '6dad9a39-86b5-44aa-af87-475bfa931e15',
                    persistent_id: '000000a',
                }],
                ['Bob', {
                    quiz_history: JSON.stringify(quizHistoryBob),
                    secure_id: 'c8014842a4e49eb',
                    testIterationId: '6dad9a39-86b5-44aa-af87-475bfa931e15',
                    persistent_id: '000000b',
                }],
            ]),
        }

        const state = await makeAliceBobFriends(t, false, props.alicePattern, props.bobPattern, initialState)
        await restoreUser(t, 'Alice', state)
        await t.navigateTo(`${target}/${today.replaceAll('1', '50')}`)
        // click a button labeled "Mean Statistics"
        await t.click(Selector('button').withExactText('Mean Statistics'))
        await t.expect(await friendsText()).eql([`You2.945010/38`, `Bob2.965030/30Remove`])
        await screencap(t)
        await restoreUser(t, 'Bob', state)
        await t.click(Selector('button').withExactText('Mean Statistics'))
        await t.expect(await friendsText()).eql([`You2.965030/30`, `Alice2.945010/38Remove`])
        await screencap(t)
    })
}

quizFriendsMeanStatsTestTemplate({
    name: 'retro',
    platform: 'desktop',
    isRetro: true,
    alicePattern: 'ynnyn',
    bobPattern: 'nyyny',
})

quizFriendsMeanStatsTestTemplate({
    name: 'juxta',
    platform: 'desktop',
    isRetro: false,
    alicePattern: 'nyynn',
    bobPattern: 'ynnyy',
})
