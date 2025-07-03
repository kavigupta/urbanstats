import { Selector } from 'testcafe'
import { z } from 'zod'

import { quizFixture, startIntercepting, stopIntercepting } from './quiz_test_utils'
import { getLocation, waitForPageLoaded } from './test_utils'

export const email = 'urban.stats.test@gmail.com'

const chooseEmail = Selector(`[data-identifier="${email}"]`)

export const signOutLink = Selector('a').withExactText('Sign Out')

export const signInLink = Selector('a[data-test="googleSignIn"]')

export const signInButton = Selector('Button').withExactText('Sign In')

const continueButton = Selector('button').withExactText('Continue')

async function googleSignIn(t: TestController): Promise<void> {
    await t.navigateTo('https://accounts.google.com')
    await t.typeText('input[type=email]', email)
    await t.click(Selector('button').withExactText('Next'))
    await t.typeText('input[type=password]', z.string().parse(process.env.URBAN_STATS_TEST_PASSWORD))
    await t.click(Selector('button').withExactText('Next'))
    await t.wait(1000) // wait for redirect
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

export async function urbanStatsGoogleSignIn(t: TestController, { enableDrive = true }: { enableDrive?: boolean } = {}): Promise<void> {
    if (await signInLink.exists) {
        await t.click(signInLink)
    }
    else if (await signInButton.exists) {
        await t.click(signInButton)
    }
    else {
        throw new Error('no sign in link or button')
    }
    await t.wait(1000) // wait for loading
    await t.click(chooseEmail)
    await t.click(continueButton)
    const checkBox = Selector('input[type=checkbox]:not([disabled])')
    if (enableDrive && await checkBox.exists) {
        await t.click(checkBox)
    }
    await startIntercepting(t) // start forwarding to the quiz server
    while (await continueButton.exists) {
        await t.click(continueButton)
    }
    await waitForPageLoaded(t)
    await t.expect(Selector('h1').withExactText(enableDrive ? 'Signed In!' : 'Sign In Failed').exists).ok()
    await t.eval(() => window.close = () => { console.warn('window closed') })
    await t.click(Selector('button').withExactText('Close Window'))
    const consoleMessages = await t.getBrowserConsoleMessages()
    await t.expect(consoleMessages.warn).contains('window closed')
}

export function quizAuthFixture(...args: Parameters<typeof quizFixture>): void {
    const beforeEach = args[5]
    quizFixture(args[0], args[1], args[2], args[3], args[4], async (t) => {
        await stopIntercepting(t)
        await googleSignIn(t)
        await dissociateUrbanStatsGoogle(t)
        await beforeEach?.(t)
        await t.navigateTo(args[1])
    })
}
