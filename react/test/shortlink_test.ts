import { quizFixture } from './quiz_test_utils'
import { getLocation, target } from './test_utils'

quizFixture(
    'shortlink-basic',
    `${target}/quiz.html#date=99`,
    { persistent_id: '000000000000007' },
    '',
)

// test('shortlink-not-found', async (t) => {
//     await t.navigateTo(`https://s.urbanstats.org/s?c=abc`)
//     await t.expect(Selector('h1').innerText).eql('Not Found')
// })

test('shortlink-found', async (t) => {
    const shortenR = await fetch('http://0.0.0.0:54579/shorten', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_text: 'data-credit.html' }),
    })
    const json = await shortenR.json() as { shortened: string }
    await t.navigateTo(`https://s.urbanstats.org/s?c=${json.shortened}`)
    await t.expect(getLocation()).eql(`${target}/data-credit.html`)
})
