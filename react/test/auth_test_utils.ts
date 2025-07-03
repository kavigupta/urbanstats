import { Selector } from 'testcafe'
import { z } from 'zod'

import { interceptRequests } from './quiz_test_utils'
import { getLocation, waitForPageLoaded } from './test_utils'

export const email = 'urban.stats.test@gmail.com'

const chooseEmail = Selector(`[data-identifier="${email}"]`)

export const signInLink = Selector('a[data-test="googleSignIn"]')

export async function urbanStatsGoogleSignIn(t: TestController): Promise<void> {
    await t.click(signInLink)
    await t.wait(1000) // wait for loading
    if (await chooseEmail.exists) {
        // we're already signed in, choose the account
        await t.click(chooseEmail)
        await t.click(Selector('button').withExactText('Continue'))
    }
    else {
        await fillSignInForm(t)
    }
    const checkBox = Selector('input[type=checkbox]:not([disabled])')
    if (await checkBox.exists) {
        await t.click(checkBox)
    }
    await interceptRequests(t) // start forwarding to the quiz server
    await t.click(Selector('button').withExactText('Continue'))
    await waitForPageLoaded(t)
    await t.expect(Selector('h1').withExactText('Signed In!').exists).ok()
    await t.eval(() => window.close = () => { console.warn('window closed') })
    await t.click(Selector('button').withExactText('Close Window'))
    const consoleMessages = await t.getBrowserConsoleMessages()
    await t.expect(consoleMessages.warn).contains('window closed')
}

async function fillSignInForm(t: TestController): Promise<void> {
    await t.typeText('input[type=email]', email)
    await t.click(Selector('button').withExactText('Next'))
    await t.typeText('input[type=password]', z.string().parse(process.env.URBAN_STATS_TEST_PASSWORD))
    await t.click(Selector('button').withExactText('Next'))
    await t.wait(1000) // wait for redirect
}

export async function googleSignIn(t: TestController): Promise<void> {
    await t.navigateTo('https://accounts.google.com')
    await fillSignInForm(t)
}

export async function dissociateUrbanStatsGoogle(t: TestController): Promise<void> {
    const urbanStatsApp = 'https://myaccount.google.com/connections/overview/AXgE0HPnaTLgt69l2Q43sNhBhyCLr6Ypz2FjZe0ZRXQrAMLNhKVpoKfSOCt4elgDR0AJ56y0Dz_QeAqvXJZrN-zKQsfsyCumNip85uO_MMdvU9xepz6cKEg'
    await t.navigateTo(urbanStatsApp)
    await t.expect((await getLocation()).startsWith('https://myaccount.google.com/connections')).ok()
    if ((await getLocation()).startsWith(urbanStatsApp)) {
        // App is signed in, and we need to clear it
        await t.click('div[data-name="Urban Stats"][role=button]')
        await t.click(Selector('button').withExactText('Confirm'))
        await t.wait(1000) // wait for completion
    }
}
