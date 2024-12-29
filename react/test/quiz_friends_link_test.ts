import { clickButtons, friendsText, quizFixture, withMockedClipboard } from './quiz_test_utils'
import { target } from './test_utils'

quizFixture('current juxta', `${target}/quiz.html`, {
    persistent_id: 'f00f',
}, '', 'desktop')

const friendLinkHash = '#name=spudwaffle&id=f00f'
const friendLink = `https://juxtastat.org/${friendLinkHash}`

test('copy friend link', async (t) => {
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    await t.setNativeDialogHandler(() => 'spudwaffle')
    const copies = await withMockedClipboard(t, async () => {
        await t.click('[data-test-id=friend-link-button]')
    })
    await t.expect(await t.getNativeDialogHistory()).eql([
        {
            text: 'Link copied to clipboard!',
            type: 'alert',
            url: 'http://localhost:8000/quiz.html',
        },
        {
            text: 'Enter your name:',
            type: 'prompt',
            url: 'http://localhost:8000/quiz.html',
        },
    ])
    await t.expect(copies).eql([friendLink])
})

quizFixture('current juxta', `${target}/quiz.html`, {
    persistent_id: 'eeee',
}, '', 'desktop')

test('paste friend link before doing quiz', async (t) => {
    await t.setNativeDialogHandler(() => true)
    await t.navigateTo(`${target}/quiz.html${friendLinkHash}`)
    await t.expect(await t.getNativeDialogHistory()).eql([
        {
            text: 'Friend added: spudwaffle !',
            type: 'alert',
            url: 'http://localhost:8000/quiz.html',
        },
    ])
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    const friends = await friendsText()
    await t.expect(friends.length).eql(2)
    await t.expect(friends[1]).eql('spudwaffleAsk\u00a0spudwaffle\u00a0to add youRemove')
})

test('paste friend link after doing quiz', async (t) => {
    await clickButtons(t, ['a', 'a', 'a', 'a', 'a'])
    await t.setNativeDialogHandler(() => true)
    await t.navigateTo(`${target}/quiz.html${friendLinkHash}`)
    await t.expect(await t.getNativeDialogHistory()).eql([
        {
            text: 'Friend added: spudwaffle !',
            type: 'alert',
            url: 'http://localhost:8000/quiz.html',
        },
    ])
    const friends = await friendsText()
    await t.expect(friends.length).eql(2)
    await t.expect(friends[1]).eql('spudwaffleAsk\u00a0spudwaffle\u00a0to add youRemove')
})
