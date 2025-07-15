import { ClientFunction, Selector } from 'testcafe'
import { TOTP } from 'totp-generator'
import { z } from 'zod'

import { TestWindow } from '../src/utils/TestUtils'

import { quizFixture } from './quiz_test_utils'
import { flaky, safeReload, target, waitForPageLoaded } from './test_utils'

export const email = 'urban.stats.test@gmail.com'

const chooseEmail = Selector(`[data-identifier="${email}"]`)

export const signOutLink = Selector('a').withExactText('Sign Out')

export const signInLink = Selector('a[data-test="googleSignIn"]')

export const signInButton = Selector('Button').withExactText('Sign In')

const continueButton = Selector('button').withExactText('Continue')

async function googleSignIn(t: TestController): Promise<void> {
    await flaky(async () => {
        await t.navigateTo('https://accounts.google.com')
    })
    await t.typeText('input[type=email]', email)
    await t.click(Selector('button').withExactText('Next'))
    await t.typeText('input[type=password]', z.string().parse(process.env.URBAN_STATS_TEST_PASSWORD))
    await t.click(Selector('button').withExactText('Next'))
    await t.typeText('input[type=tel]', TOTP.generate(z.string().parse(process.env.URBAN_STATS_TEST_TOTP)).otp)
    await t.click(Selector('button').withExactText('Next'))
    await t.expect(Selector('h1').withExactText('Welcome, Urban Stats').exists).ok()
}

async function googleSignOut(t: TestController): Promise<void> {
    await flaky(async () => {
        await t.navigateTo('https://accounts.google.com/Logout')
    })
    await t.expect(Selector('h1').withExactText('Choose an account').exists).ok()
}

export async function corruptTokens(t: TestController): Promise<void> {
    const testEmail = email
    const fn = (): void => {
        const { persistentId } = JSON.parse(localStorage.getItem('quizAuthenticationState')!) as { persistentId: string }
        localStorage.setItem('quizAuthenticationState', JSON.stringify({
            state: 'signedIn',
            email: testEmail,
            persistentId,
            token: {
                accessToken: 'abc',
                refreshToken: '123',
                expiresAt: 0,
            },
        }))
    }
    await t.eval(fn, { dependencies: { testEmail } })
    await safeReload(t)
    await t.expect(Selector('h1').withExactText('You were signed out').exists).ok()
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
    while (await continueButton.exists) {
        await t.click(continueButton)
    }
    await waitForPageLoaded(t)
    await t.expect(Selector('h1').withExactText(enableDrive ? 'Signed In!' : 'Sign In Failed').exists).ok()
    await t.eval(() => window.close = () => { console.warn('window closed') })
    await t.click(Selector('button').withExactText('Close Window'))
    const consoleMessages = await t.getBrowserConsoleMessages()
    await t.expect(consoleMessages.warn).contains('window closed')
    await t.navigateTo(`${target}/quiz.html`)
    await waitForPageLoaded(t)
    await waitForSync(t)
}

export function quizAuthFixture(...args: Parameters<typeof quizFixture>): void {
    const beforeEach = args[5]
    const afterEach = args[6]
    quizFixture(args[0], args[1], args[2], args[3], args[4], async (t) => {
        await googleSignIn(t)
        await beforeEach?.(t)
        await t.navigateTo(args[1])
        await waitForPageLoaded(t)
    }, async (t) => {
        await googleSignOut(t)
        await afterEach?.(t)
    })
}

export async function waitForSync(t: TestController): Promise<void> {
    const isSyncing = ClientFunction(() => (window as unknown as TestWindow).testUtils.testSyncing)
    do {
        await t.wait(1000)
    } while (await isSyncing())
}
