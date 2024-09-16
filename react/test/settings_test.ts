import { Selector } from 'testcafe'

import {
    SEARCH_FIELD, TARGET, check_textboxes, getLocation,
    screencap,
    urbanstatsFixture,
} from './test_utils'

urbanstatsFixture('settings regression test', `${TARGET}/article.html?longname=San+Marino+city%2C+California%2C+USA`,
    async (t) => {
        await t.eval(() => {
            const EG_SETTINGS = '{"related__State__County":true,"related__Native Area__Native Subdivision":true,"related__Native Statistical Area__Native Subdivision":true,"related__CSA__MSA":true,"related__MSA__County":true,"related__County__City":true,"related__CCD__City":true,"related__City__Neighborhood":true,"related__School District__Neighborhood":true,"related__ZIP__Neighborhood":false,"related__Urban Area__City":true,"related__Judicial Circuit__Judicial District":true,"related__County__County":true,"related__MSA__MSA":true,"related__CSA__CSA":true,"related__Urban Area__Urban Area":true,"related__ZIP__ZIP":true,"related__CCD__CCD":true,"related__City__City":false,"related__Neighborhood__Neighborhood":true,"related__Congressional District__Congressional District":true,"related__State House District__State House District":true,"related__State Senate District__State Senate District":true,"related__Historical Congressional District__Historical Congressional District":true,"related__Native Area__Native Area":true,"related__Native Statistical Area__Native Statistical Area":true,"related__Native Subdivision__Native Subdivision":true,"related__School District__School District":true,"related__Judicial District__Judicial District":true,"related__Judicial Circuit__Judicial Circuit":true,"related__County Cross CD__County Cross CD":true,"related__USDA County Type__USDA County Type":true,"related__Hospital Referral Region__Hospital Referral Region":true,"related__Hospital Service Area__Hospital Service Area":true,"related__Media Market__Media Market":true,"related__Continent__Continent":true,"related__Country__Country":true,"related__Subnational Region__Subnational Region":true,"related__Urban Center__Urban Center":true,"related__State__State":true,"related__5M Person Circle__5M Person Circle":true,"related__US 5M Person Circle__US 5M Person Circle":true,"related__10M Person Circle__10M Person Circle":true,"related__US 10M Person Circle__US 10M Person Circle":true,"related__20M Person Circle__20M Person Circle":true,"related__US 20M Person Circle__US 20M Person Circle":true,"related__50M Person Circle__50M Person Circle":true,"related__US 50M Person Circle__US 50M Person Circle":true,"related__100M Person Circle__100M Person Circle":true,"related__US 100M Person Circle__US 100M Person Circle":true,"related__200M Person Circle__200M Person Circle":true,"related__US 200M Person Circle__US 200M Person Circle":true,"related__500M Person Circle__500M Person Circle":true,"related__US 500M Person Circle__US 500M Person Circle":true,"related__1B Person Circle__1B Person Circle":true,"related__US 1B Person Circle__US 1B Person Circle":true,"show_statistic_main":true,"show_statistic_race":false,"show_statistic_national_origin":false,"show_statistic_education":false,"show_statistic_generation":false,"show_statistic_income":false,"show_statistic_housing":false,"show_statistic_transportation":false,"show_statistic_health":false,"show_statistic_climate":true,"show_statistic_industry":false,"show_statistic_occupation":false,"show_statistic_election":false,"show_statistic_feature":false,"show_statistic_weather":false,"show_statistic_misc":false,"show_statistic_other_densities":true,"show_statistic_2010":false,"use_imperial":true,"simple_ordinals":true,"related__ZIP__City":true}'
            localStorage.setItem('settings', EG_SETTINGS)
            location.reload()
        })
    })

test('check-settings-loaded', async (t) => {
    // screenshot path: images/first_test.png
    await screencap(t, 'settings/check-settings-loaded')
    // check there's an element containing class Huntington_Library
    await t.expect(Selector('path').withAttribute('class', /tag-Huntington_Library/).exists).ok()
    // check that there's no element Pasadena_city or 91101
    await t.expect(Selector('path').withAttribute('class', /tag-Pasadena_city/).exists).notOk()
    await t.expect(Selector('path').withAttribute('class', /tag-91101/).exists).notOk()
})

test('check-settings-loaded-desktop', async (t) => {
    // screenshot path: images/first_test.png
    await t.resizeWindow(1400, 800)
    await t.eval(() => { location.reload() })
    await screencap(t, 'settings/check-settings-loaded-desktop')
})

test('check-settings-persistent', async (t) => {
    await t.expect(Selector('span').withText('mi').exists).ok()
    // navigate to Pasadena via search
    await t.typeText(SEARCH_FIELD, 'Pasadena, CA, USA')
    await t.pressKey('enter')
    await t.expect(getLocation()).eql(`${TARGET}/article.html?longname=Pasadena+city%2C+California%2C+USA`)
    // check box "Imperial"
    await check_textboxes(t, ['Use Imperial Units'])
    // assert mi not in page
    await t.expect(Selector('span').withText('mi').exists).notOk()
    // go back to San Marino
    await t.eval(() => { location.reload() })
    await t.expect(Selector('span').withText('mi').exists).notOk()
})

test('check-related-button-checkboxes-page-specific', async (t) => {
    // navigate to 91108
    await t.typeText(SEARCH_FIELD, '91108')
    await t.pressKey('enter')
    await t.expect(getLocation()).eql(`${TARGET}/article.html?longname=91108%2C+USA`)
    // this should not be page specific
    await t.expect(Selector('span').withText('mi').exists).ok()
    // San Marino should be present
    await t.expect(Selector('path').withAttribute('class', /tag-San_Marino_city/).exists).ok()
    // neighborhoods should not be present (Huntington Library)
    await t.expect(Selector('path').withAttribute('class', /tag-Huntington_Library/).exists).notOk()
})

test('checkboxes-can-be-checked', async (t) => {
    // check that Pasadena CCD is not present
    await t.expect(Selector('path').withAttribute('class', /tag-Pasadena_CCD/).exists).notOk()
    const pasadena_ccd = Selector('li').withAttribute('class', 'list_of_lists')
        .withText('Pasadena CCD')
    // find a checkbox inside it
        .find('input')
    await t
        .click(pasadena_ccd)
    // check that Pasadena CCD is now present
    await t.expect(Selector('path').withAttribute('class', /tag-Pasadena_CCD/).exists).ok()
    // check that this is persistent by going to Berkeley and checking that Briones CCD is present
    await t.typeText(SEARCH_FIELD, 'Berkeley, CA, USA')
    await t.pressKey('enter')
    await t.expect(getLocation()).eql(`${TARGET}/article.html?longname=Berkeley+city%2C+California%2C+USA`)
    await t.expect(Selector('path').withAttribute('class', /tag-Briones_CCD/).exists).ok()
})
