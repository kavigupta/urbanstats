import { ClientFunction, Selector } from 'testcafe'

import { nthEditor, typeInEditor } from './editor_test_utils'
import { getCodeFromMainField, getErrors, getInput, replaceInput, toggleCustomScript } from './mapper-utils'
import { checkTextboxesDirect, mapper, screencap } from './test_utils'

const base = 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)'

// Errors render as #test-editor-result, so the count inside a subtree says where one was routed
const errorsWithin = ClientFunction((id: string) => document.getElementById(id)?.querySelectorAll('#test-editor-result').length)

function addConditionButton(nth = 0): Selector {
    return Selector('button').withAttribute('data-test-id', 'test-add-condition-button').nth(nth)
}

mapper(() => test)('build a comparison', { code: base }, async (t) => {
    await toggleCustomScript(t)
    await checkTextboxesDirect(t, ['Filter?'])
    // Checking the box gives a comparison to start from, rather than an empty code box
    await t.expect(getInput('Comparison').exists).ok()
    await t.expect(getInput('PW Density (r=1km)').exists).ok()
    await t.expect(getErrors()).eql([])

    await replaceInput(t, 'PW Density (r=1km)', 'Population')
    await replaceInput(t, '>', '≤')
    await replaceInput(t, '0', '1000000')
    await t.expect(getErrors()).eql([])
    await screencap(t, { removeEntireMap: true })

    await toggleCustomScript(t)
    await t.expect(getCodeFromMainField()).contains('condition (population <= 1000000)')
})

mapper(() => test)('a comparison against another statistic', { code: base }, async (t) => {
    await toggleCustomScript(t)
    await checkTextboxesDirect(t, ['Filter?'])
    await replaceInput(t, 'PW Density (r=1km)', 'Population')
    await replaceInput(t, 'Constant', 'PW Density (r=1km)')
    await t.expect(getErrors()).eql([])
    await toggleCustomScript(t)
    await t.expect(getCodeFromMainField()).contains('condition (population > density_pw_1km)')
})

mapper(() => test)('group conditions and nest them', { code: base }, async (t) => {
    await toggleCustomScript(t)
    await checkTextboxesDirect(t, ['Filter?'])
    await replaceInput(t, 'Comparison', 'All of')
    await t.expect(getErrors()).eql([])

    // Grouping keeps the comparison that was already there and offers a second
    await replaceInput(t, '0', '10')
    await replaceInput(t, '0', '100')
    await toggleCustomScript(t)
    await t.expect(getCodeFromMainField()).contains('condition (density_pw_1km > 10 & density_pw_1km > 100)')
    await toggleCustomScript(t)

    // A third condition, made into an "any of" group of its own
    await t.click(addConditionButton())
    await replaceInput(t, 'Comparison', 'Any of', 2)
    await t.expect(getErrors()).eql([])
    await screencap(t, { removeEntireMap: true })
    await toggleCustomScript(t)
    await t.expect(getCodeFromMainField()).contains(
        'condition (density_pw_1km > 10 & density_pw_1km > 100 & (density_pw_1km > 0 | density_pw_1km > 0))',
    )
})

mapper(() => test)('removing the second of two conditions ungroups', { code: base }, async (t) => {
    await toggleCustomScript(t)
    await checkTextboxesDirect(t, ['Filter?'])
    await replaceInput(t, 'Comparison', 'All of')
    await replaceInput(t, '0', '10')
    await t.click(Selector('button').withAttribute('title', 'Remove condition').nth(1))
    await t.expect(getErrors()).eql([])
    await toggleCustomScript(t)
    await t.expect(getCodeFromMainField()).contains('condition (density_pw_1km > 10)')
})

mapper(() => test)('a condition written as code comes up graphically', {
    code: `customNode("");\ncondition (customNode("population > 1000 & density_pw_1km > 5"))\n${base}`,
}, async (t) => {
    // Already structured, so it opens in auto UX. Not a code box: the saved condition is read back into the grammar
    await t.expect(getInput('All of').exists).ok()
    await t.expect(getInput('Population').exists).ok()
    await t.expect(getInput('1000').exists).ok()
    await t.expect(getErrors()).eql([])
})

mapper(() => test)('leaving custom reads the code as a condition', { code: base }, async (t) => {
    await toggleCustomScript(t)
    await checkTextboxesDirect(t, ['Filter?'])
    await replaceInput(t, 'Comparison', 'Custom Expression')
    await typeInEditor(t, 0, 'population > 50 & density_pw_1km < 8000', true)
    await t.expect(getErrors()).eql([])

    await replaceInput(t, 'Custom Expression', 'All of')
    await t.expect(getInput('Population').exists).ok()
    await t.expect(getInput('50').exists).ok()
    await t.expect(getInput('8000').exists).ok()
    await toggleCustomScript(t)
    await t.expect(getCodeFromMainField()).contains('condition (population > 50 & density_pw_1km < 8000)')
})

mapper(() => test)('an expression outside the grammar stays a code box', { code: base }, async (t) => {
    await toggleCustomScript(t)
    await checkTextboxesDirect(t, ['Filter?'])
    await replaceInput(t, 'Comparison', 'Custom Expression')
    await typeInEditor(t, 0, '!(population < 1000)', true)
    await replaceInput(t, 'Custom Expression', 'All of')
    // The code becomes the first operand rather than being thrown away
    await t.expect(nthEditor(0).textContent).eql('!(population < 1000)\n')
    await t.expect(getErrors()).eql([])
})

mapper(() => test)('unchecking the filter clears it', { code: base }, async (t) => {
    await toggleCustomScript(t)
    await checkTextboxesDirect(t, ['Filter?'])
    await replaceInput(t, '0', '10')
    await checkTextboxesDirect(t, ['Filter?'])
    await t.expect(getInput('Comparison').exists).notOk()
    await toggleCustomScript(t)
    await t.expect(getCodeFromMainField()).notContains('condition')
})

mapper(() => test)('a parse error in one side of a comparison is reported there', { code: base }, async (t) => {
    await toggleCustomScript(t)
    await checkTextboxesDirect(t, ['Filter?'])
    await replaceInput(t, 'PW Density (r=1km)', 'Custom Expression')
    await typeInEditor(t, 0, 'density_pw_1km +', true)

    await t.expect(getErrors()).eql(['Unexpected end of input at 1:16'])
    // Against the operand that has the problem, and only there
    await t.expect(errorsWithin('auto-ux-editor-rc_pos_0')).eql(1)
    await t.expect(errorsWithin('condition-editor-rc')).eql(1)
})

mapper(() => test)('an error in one condition of a group is reported there', { code: base }, async (t) => {
    await toggleCustomScript(t)
    await checkTextboxesDirect(t, ['Filter?'])
    await replaceInput(t, 'Comparison', 'All of')
    await replaceInput(t, 'PW Density (r=1km)', 'Custom Expression', 1)
    await typeInEditor(t, 0, 'density_pw_1km +', true)

    await t.expect(errorsWithin('condition-editor-rc_el_1')).eql(1)
    await t.expect(errorsWithin('condition-editor-rc_el_0')).eql(0)
})
