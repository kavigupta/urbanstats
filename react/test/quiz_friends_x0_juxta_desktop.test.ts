import { quizFriendsTest } from './quiz_friends_test_template'

const aliceJuxta99 = 'yyyyn'
const aliceJuxta98 = 'nynyy'
const aliceRetro11 = 'yyynn'
const juxta99 = 'quiz.html#date=99'
const juxta98 = 'quiz.html#date=98'
const retro11 = 'quiz.html#date=11&mode=retro'

quizFriendsTest(
    {
        name: 'juxta',
        alicePattern: aliceJuxta99,
        alicePatternPrev: aliceJuxta98,
        aliceOtherPattern: aliceRetro11,
        today: juxta99,
        yesterday: juxta98,
        other: retro11,
        platform: 'desktop',
    },
)
