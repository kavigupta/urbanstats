import { Selector } from 'testcafe'

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
    const cdpSesh = await t.getCurrentCDPSession()
    cdpSesh.Fetch.on('requestPaused', async (event) => {
        try {
            const response = await fetch(event.request.url.replaceAll('https://s.urbanstats.org', 'http://localhost:54579'), {
                ...event.request,
                redirect: 'manual',
            })
            const responseHeaders: { name: string, value: string }[] = []
            response.headers.forEach((value, name) => {
                if (name === 'location') {
                    responseHeaders.push({
                        name,
                        value: value.replaceAll('https://urbanstats.org', 'http://localhost:8000'),
                    })
                }
                else {
                    responseHeaders.push({ name, value })
                }
            })
            await cdpSesh.Fetch.fulfillRequest({ requestId: event.requestId, responseHeaders, responseCode: response.status })
        }
        catch (e) {
            console.error(`Failure in CDP requestPaused handler: ${e}`)
        }
    })
    await cdpSesh.Fetch.enable({
        patterns: [{
            urlPattern: 'https://s.urbanstats.org/*',
        }],
    })
    await t.navigateTo(`https://s.urbanstats.org/s?c=${json.shortened}`)
    await t.expect(getLocation()).eql(`${target}/data-credit.html`)
})
