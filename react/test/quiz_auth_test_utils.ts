import { ClientFunction, Selector } from 'testcafe'
import { TOTP } from 'totp-generator'
import { z } from 'zod'

import { TestWindow } from '../src/utils/TestUtils'

import { quizFixture } from './quiz_test_utils'
import { getTOTPWait, setTOTPWait } from './scripts/util'
import { flaky, getCurrentTest, safeReload, target, waitForLoading } from './test_utils'

export const email = 'urban.stats.test@pavonine.co'

const chooseEmail = Selector(`[data-identifier="${email}"]`)

export const signOutLink = Selector('a').withExactText('Sign Out')

export const signInLink = Selector('a[data-test="googleSignIn"]')

export const signInButton = Selector('Button').withExactText('Sign In')

const continueButton = Selector('button').withExactText('Continue')

const totpInput = Selector('input[type=tel]')

const nextButton = Selector('button').withExactText('Next')
const emailInput = Selector('input[type=email]:not([aria-hidden="true"])')
const passwordInput = Selector('input[type=password]')

async function popTOTP(t: TestController): Promise<string> {
    // https://script.google.com/u/2/home/projects/1CWDP4eezFo8fMhQb327VfSm3DnThl-8xg1fmg4cl9gHnK0NGB8XSz094/edit
    const { useAfter } = z.object({ useAfter: z.number() }).parse(await (await fetch('https://script.google.com/macros/s/AKfycbxLMtid0yZ_JiX5Ymm02FXfbRXYrpF1AE9nUaDM8P9dhP7uOWJpMRH8SpG5TbCQCRc/exec')).json())
    const wait = useAfter - Date.now()
    if (wait > 0) {
        console.warn(`TOTP waiting ${wait} ms...`)
        await setTOTPWait(getCurrentTest(t), await getTOTPWait(getCurrentTest(t)) + wait)
        await t.wait(wait)
    }
    console.warn(`Using TOTP for ${useAfter}`)
    const { otp } = await TOTP.generate(z.string().parse(process.env.URBAN_STATS_TEST_TOTP))
    return otp
}

async function fillTOTP(t: TestController): Promise<void> {
    await t.expect(totpInput.exists).ok()
    await t.typeText(totpInput, await popTOTP(t), { replace: true })
    await t.click(nextButton)
    try {
        await t.expect(totpInput.exists).notOk()
        console.warn('TOTP Success')
    }
    catch (error) {
        console.warn(`TOTP Failure!`)
        throw error
    }
}

let googleCookies: CookieOptions[] | undefined
async function googleSignIn(t: TestController): Promise<void> {
    if (googleCookies !== undefined) {
        await t.setCookies(googleCookies)
    }
    await flaky(t, async () => {
        await t.navigateTo('https://accounts.google.com')
    })
    await flaky(t, async () => {
        while (true) {
            await t.wait(1000) // Wait for animation
            if (await chooseEmail.exists) {
                await t.click(chooseEmail)
            }
            else if (await emailInput.exists) {
                await t.typeText(emailInput, email)
                await t.click(nextButton)
            }
            else if (await passwordInput.exists) {
                await t.typeText(passwordInput, z.string().parse(process.env.URBAN_STATS_TEST_PASSWORD))
                await t.click(nextButton)
            }
            else if (await totpInput.exists) {
                await fillTOTP(t)
            }
            else {
                await t.expect(Selector('h1').withExactText('Urban Stats').exists).ok()
                break
            }
        }
    })

    googleCookies = (await t.getCookies()).filter(cookie => cookie.domain?.includes('google'))
}

async function googleSignOut(t: TestController): Promise<void> {
    await flaky(t, async () => {
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
    await flaky(t, async () => {
        if (await totpInput.exists) {
            await fillTOTP(t)
        }
        await t.expect(continueButton.exists).ok()
    })
    await t.click(continueButton)
    const checkBox = Selector('input[type=checkbox]:not([disabled])')
    if (enableDrive && await checkBox.exists) {
        await t.click(checkBox)
    }
    while (await continueButton.exists) {
        await t.click(continueButton)
    }
    await waitForLoading()
    await t.expect(Selector('h1').withExactText(enableDrive ? 'Signed In!' : 'Sign In Failed').exists).ok()
    await t.eval(() => window.close = () => { console.warn('window closed') })
    await t.click(Selector('button').withExactText('Close Window'))
    const consoleMessages = await t.getBrowserConsoleMessages()
    await t.expect(consoleMessages.warn).contains('window closed')
    await t.navigateTo(`${target}/quiz.html`)
    await waitForLoading()
    await waitForSync(t)
}

export function quizAuthFixture(...args: Parameters<typeof quizFixture>): void {
    const beforeEach = args[5]
    const afterEach = args[6]
    quizFixture(args[0], args[1], args[2], args[3], args[4], async (t) => {
        await googleSignIn(t)
        await beforeEach?.(t)
        await t.navigateTo(args[1])
        await waitForLoading()
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
