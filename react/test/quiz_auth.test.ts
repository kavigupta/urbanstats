import { Selector } from 'testcafe'
import { z } from 'zod'

import { exampleQuizHistory } from './quiz_test_template'
import { interceptRequests, quizFixture } from './quiz_test_utils'
import { getLocation, target, waitForPageLoaded } from './test_utils'

const email = 'urban.stats.test@gmail.com'

quizFixture('sign in to google', target, {
    quiz_history: JSON.stringify(exampleQuizHistory(600, 650)),
}, '', 'desktop', false)

test('sign in to google', async (t) => {
    const urbanStatsApp = 'https://myaccount.google.com/connections/overview/AXgE0HPnaTLgt69l2Q43sNhBhyCLr6Ypz2FjZe0ZRXQrAMLNhKVpoKfSOCt4elgDR0AJ56y0Dz_QeAqvXJZrN-zKQsfsyCumNip85uO_MMdvU9xepz6cKEg'
    await t.navigateTo(urbanStatsApp)
    await t.typeText('input[type=email]', email)
    await t.click(Selector('button').withExactText('Next'))
    await t.typeText('input[type=password]', z.string().parse(process.env.URBAN_STATS_TEST_PASSWORD))
    await t.click(Selector('button').withExactText('Next'))
    await t.wait(1000) // wait for redirect
    await t.expect((await getLocation()).startsWith('https://myaccount.google.com/connections')).ok()
    if ((await getLocation()).startsWith(urbanStatsApp)) {
        // App is signed in, and we need to clear it
        await t.click('div[data-name="Urban Stats"][role=button]')
        await t.click(Selector('button').withExactText('Confirm'))
        await t.wait(1000) // wait for completion
    }
    await t.navigateTo(`${target}/quiz.html`)
    await t.click('a[data-test="googleSignIn"')
    await t.wait(1000) // wait for loading
    await t.click(`[data-identifier="${email}"]`)
    await t.click(Selector('button').withExactText('Continue'))
    await t.click('input[type=checkbox]:not([disabled])')
    await interceptRequests(t) // start forwarding to the quiz server
    await t.click(Selector('button').withExactText('Continue'))
    await waitForPageLoaded(t)
    await t.expect(Selector('h1').withExactText('Signed In!').exists).ok()
    await t.eval(() => window.close = () => { console.warn('window closed') })
    await t.click(Selector('button').withExactText('Close Window'))
    const consoleMessages = await t.getBrowserConsoleMessages()
    await t.expect(consoleMessages.warn).contains('window closed')
    await t.navigateTo(`${target}/quiz.html`)
    await t.expect(Selector('a').withExactText('Sign Out').exists).ok()
    await t.expect(Selector('div').withText(`Signed in with ${email}.`).exists).ok()
})
