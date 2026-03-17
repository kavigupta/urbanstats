import { Selector } from 'testcafe'

import { checkBox, toggleCustomScript } from './mapper-utils'
import { safeReload, screencap, target, urbanstatsFixture } from './test_utils'

urbanstatsFixture('mapper', `${target}/mapper.html`)

function expandButton(name?: string): Selector {
    if (name) {
        return Selector(`[data-test=expand-button][data-test-name="${name}"]`)
    }
    else {
        return Selector('[data-test=expand-button]')
    }
}

test('expanded when checking insets, click expand button to collapse', async (t) => {
    await t.expect(expandButton().length).eql(0) // No expand arrows initially
    await checkBox(t, /Insets/)
    await t.expect(expandButton('insets').getAttribute('data-test-state')).eql('true')
    await screencap(t, { selector: Selector('[data-test=split-left]'), scrollTargetY: 1000 })
    await t.click(expandButton('insets'))
    await t.expect(expandButton('insets').getAttribute('data-test-state')).eql('false')
    await screencap(t, { selector: Selector('[data-test=split-left'), scrollTargetY: 1000 })
    await safeReload(t)
    await t.expect(expandButton('insets').getAttribute('data-test-state')).eql('false')
    await toggleCustomScript(t)
    await t.expect(expandButton().length).eql(0)
    await toggleCustomScript(t)
    await t.expect(expandButton('insets').getAttribute('data-test-state')).eql('true')
})

for (const [argName, humanName, editButtonName] of [
    ['insets', 'Insets', 'insets'],
    ['textBoxes', 'Text Boxes', 'text-boxes'],
]) {
    const editButton = Selector(`button[data-test=edit-${editButtonName}]`)

    async function editAddAccept(t: TestController): Promise<void> {
        await t.click(editButton)
        await t.click('[data-test=add]')
        await t.click(Selector('button').withExactText('Accept'))
    }

    test(`edit ${humanName} without first checking`, async (t) => {
        await editAddAccept(t)
        await t.expect(expandButton().count).eql(1)
        await t.expect(expandButton(argName).getAttribute('data-test-state')).eql('false')
    })

    test(`edit ${humanName} after first checking`, async (t) => {
        await checkBox(t, new RegExp(humanName))
        await t.expect(expandButton(argName).getAttribute('data-test-state')).eql('true')
        await editAddAccept(t)
        await t.expect(expandButton(argName).getAttribute('data-test-state')).eql('true')
    })

    test(`edit ${humanName} after first checking and collapsing`, async (t) => {
        await checkBox(t, new RegExp(humanName))
        await t.click(expandButton(argName))
        await t.expect(expandButton(argName).getAttribute('data-test-state')).eql('false')
        await editAddAccept(t)
        await t.expect(expandButton(argName).getAttribute('data-test-state')).eql('false')
    })

    test(`edit ${humanName} twice, and still able to edit`, async (t) => {
        await editAddAccept(t)
        await editAddAccept(t)
        await t.expect(editButton.exists).ok()
    })
}

urbanstatsFixture('mapper with collapsed insets', `${target}/mapper.html?settings=H4sIAAAAAAAAA12QTWvDMAyG%2F0rwKYFcdu3IoeywldFRGjIG8yiabTJRRzaWvVJC%2FvucpuwQH4z0vC%2F6GkVvXB%2FA%2F1xfkbTYiDZ9E0R0BLY4mj4HohaJ8NcENlnv2m0GrAL6KDajSMyZqsTRDW9Om1IKKapHScqRxrlQUcaQTJXJHnwpqchPQ4RGG2KM15O%2FnB7OQ70orMCaxiIZCO0cl9VdCTD4Zv66gBr5TpHYRG4gRdd93AbIjTl3VHF3k8rPxfhvfnIUc3mKYPMy9Up9TjCs2SGZEN0RlTvYxF37vls7XuACiGu6tcBnWOBXVRdSjFJKoZy14NnoOdnMx5nyySRVYpr%2BAB4FYM6RAQAA`)

test('compatibility with links', async (t) => {
    await t.expect(expandButton('insets').getAttribute('data-test-state')).eql('false')
})

test('undo state not affected', async (t) => {
    await t.resizeWindow(400, 800)
    await t.click(expandButton('insets'))
    await t.expect(Selector('button:disabled').withExactText('Undo').count).eql(1) // So other buttons don't mess up this test
})
