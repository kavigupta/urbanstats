import { quizFriendsTest } from './quiz_friends_test_template'

const aliceJuxta99 = 'yyyyn'
const aliceRetro11 = 'yyynn'
const aliceRetro10 = 'nnnny'
const juxta99 = 'quiz.html#date=99'
const retro11 = 'quiz.html#date=11&mode=retro'
const retro10 = 'quiz.html#date=10&mode=retro'

quizFriendsTest(
    {
        name: 'retro',
        alicePattern: aliceRetro11,
        alicePatternPrev: aliceRetro10,
        aliceOtherPattern: aliceJuxta99,
        today: retro11,
        yesterday: retro10,
        other: juxta99,
        platform: 'desktop',
    },
)
