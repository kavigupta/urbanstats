import { ClientFunction, Selector } from 'testcafe'
import { z } from 'zod'

import { quizFixture } from './quiz_test_utils'
import { target, waitForPageLoaded } from './test_utils'

export const email = 'urban.stats.test@gmail.com'

const chooseEmail = Selector(`[data-identifier="${email}"]`)

export const signOutLink = Selector('a').withExactText('Sign Out')

export const signInLink = Selector('a[data-test="googleSignIn"]')

export const signInButton = Selector('Button').withExactText('Sign In')

const continueButton = Selector('button').withExactText('Continue')

async function flakyNavigate(t: TestController, dest: string): Promise<void> {
    while (true) {
        try {
            await t.navigateTo(dest)
            break
        }
        catch (e) {
            console.warn('Problem navigating', e)
            await t.wait(1000)
        }
    }
}

async function googleSignIn(t: TestController): Promise<void> {
    await flakyNavigate(t, 'https://accounts.google.com')
    await t.typeText('input[type=email]', email)
    await t.click(Selector('button').withExactText('Next'))
    await t.typeText('input[type=password]', z.string().parse(process.env.URBAN_STATS_TEST_PASSWORD))
    await t.click(Selector('button').withExactText('Next'))
    await t.wait(1000) // wait for redirect
}

export async function dissociateUrbanStatsGoogle(t: TestController): Promise<void> {
    await flakyNavigate(t, 'https://drive.google.com/drive/u/0/settings')
    await t.click(Selector('div').withExactText('Manage apps'))
    const optionsDropdown = Selector('button[aria-label="Options for Urban Stats (Unverified)"]')
    if (await optionsDropdown.exists) {
        const disconnectButton = Selector('div').withExactText('Disconnect from Drive')
        while (!(await disconnectButton.exists)) {
            // Dropdown goes away on first click
            await t.click(optionsDropdown)
            await t.wait(1000)
        }
        await t.click(disconnectButton)
        await t.click(Selector('button').withExactText('Disconnect'))
        await t.wait(1000) // wait to process
    }

    await t.navigateTo(`${target}/quiz.html`)
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
}

export function quizAuthFixture(...args: Parameters<typeof quizFixture>): void {
    const beforeEach = args[5]
    quizFixture(args[0], args[1], args[2], args[3], args[4], async (t) => {
        await googleSignIn(t)
        await dissociateUrbanStatsGoogle(t)
        await beforeEach?.(t)
        await t.navigateTo(args[1])
    })
}

export async function waitForSync(t: TestController): Promise<void> {
    const isSyncing = ClientFunction(() => localStorage.getItem('test_syncing') !== 'false')
    do {
        await t.wait(1000)
    } while (await isSyncing())
}
