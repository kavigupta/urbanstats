import { downloadPNG, getCodeFromMainField, getErrors, toggleCustomScript } from './mapper-utils'
import { urbanstatsFixture } from './test_utils'

const urls = {
    somewhatComplicatedRegression: '/mapper.html?settings=H4sIAAAAAAAAA1VQ22rDMAz9FWEYOGBK0q5dL3iw7XFse%2Bj2tIziOCI1S2zjS5tS%2Bu9z2kGpH%2BSjoyN0pCNp0DRO2O3hVemaLMmLiTocCCNRqx06j4n7Wj8lwkunbCDLI4neJ1ZGH0z3bmqkJXHYOOAwfOi9MpoeuDRdFwNughPaq8CgL3iraY1DdtjY%2Fab47TIGe1TNNnBrbGxFSL1ZSbJVqaXRtRpyoDezrkJ4hCJPL%2BmzpH8TltYiCH4j7%2F99jZIzVUfR%2BlVZ6j71MPBStMhbpVG49YBpJ3qejwoGEnVAx%2FOkcqKzfAhfTtXKM2hFhS0v07HOG8LnZUMQldkhYG9RhovBSnisIYHr4hl83%2F2UhJ1rnbBcm%2BcLommWiWGwk46nfXBRho8LQaVpjeOuqWjOIB%2BNi%2BlsPhs%2F3E%2FzxTyfLCYMiustUz3LyOn0Bx84HTfgAQAA',
    densityPointMap: '/mapper.html?settings=H4sIAAAAAAAAAyWOwWrDMBBEf8XoJIEPTqGXFB3SHktzSMjNELbW4i61doVWamtC%2Fr1yexlmHswwNzOjzBnSx%2FpKHMzevEjlspreVKYvzIqNXc6HBnTKlIrZ30xVbXSqWiQeJaAdzWjc08iTcKBCwp0tuaIbOb1BsgEK%2BICsVNZr%2Br7uPmPf6QQL%2BkXm82ZsJPa7Yei7CD%2F%2BcRgG13cZYvKbXDIF0gZwgdJuHTKCT5LqFoX%2FSicIVNU%2FtIl3UIyQPMvzv7POmfv9FxjLSortAAAA',
    rgbMap: '/mapper.html?settings=H4sIAAAAAAAAA42OsWrDMBCGX0UcFKTiIV4TNFQZPJR2cBO6CMrZFqmIJRnp1CSEvHuVhhqyZbv7fr7%2F7gw7E3YRp%2B%2FTq%2FUDLGEdsqcTVJC9%2FTExmcK2Hy8FpD7aiWB5hpxSoX1OFNx7GAzXoEGstO%2BDHyzZ4BmnmI0o5A2ntlF8QMJW3inOeuuy4%2FWCPbM%2BOJfJfFFEnyxVrBalsmJXr3nA6%2Bze3EnqAemA436WRuzMKDW0cn2L2eb%2Fl2ZG6u%2BMmvfP0rBiDo%2FXclkvnjRUrMNkHE7SB3WbuBBwufwCmMvBE2wBAAA%3D',
    textBoxesMap: '/mapper.html?settings=H4sIAAAAAAAAA31SbWvbMBD%2BK4dhYA8vsUOcNhketBmFMTbGsn5q2qDYF1uLLQlJbh2M%2F%2Fsku3GyLfTA59Nzb7p71DgZ8kwSkR%2B%2BUpY6C2dVbRnRlDNSwE%2FMjOH4TsXoM0qFxn%2B%2FujGASiQV2lk0TqWUQZNKaV5%2B5ym6a4dxdkcLjRLTH1xURVcOYlBV6YoB8D6u1yzhLKWd%2B8wDnyAMevFszDci3JRoEqfIFNWHjXjZhPvSB5WQAuOCMiRyZW3X80GSUsRW3UuaUuWDxlrf8hpV%2FPBquub6iOyWVyxVccO41PkCQh%2BQKL2AYDS5nkfRbDqZheF8Pp2EkenFKxsUjK6NzIyEQRROwsnchxfsstq%2BVSz17jNPqhKZdh%2FM%2FcGIwVZaUpa56%2FXa%2BZWb3QAxnz35sONMx9a8kZQUPUY1KWgSa1mh5%2F9XRfNXQ9oZ3G5d8P7fDcMYLnJhHSbFLGvLi7TrcXaJJa8kRWnNC50t%2FA74DgRyUSBIFBKVmRVToAx0ThWURPRDKJOzx34IU%2BnR8wY6LnMQjKITC%2FPztYfDnkdXrb24TFEuecFlnKtnNwp8S2BoZyLJPuv20rtltnVNMR9e1ZX3NlF3XJZmUd2kO6s7kViQuqlbzzzkI0aZ3jQfTqedPrRPfx2H0JxoOBWrqXc0fXxqJkOYoEDhFAV1O8SlJ%2FgNamwAOyrDgHlEGYs7vbQkyfO8LyXJsEvLtRZqMR7b%2FyghekytS42nwXz0W2Rdw57AR8%2BYTtv%2BAa893Pw6BAAA',
}

function regressionTest(testFn: () => TestFn, name: keyof typeof urls, code: string): void {
    urbanstatsFixture(name, urls[name])

    testFn()(name, async (t) => {
        await t.expect(getErrors()).eql([])
        await downloadPNG(t)
        await toggleCustomScript(t)
        await t.expect(getErrors()).eql([])
        await t.expect(getCodeFromMainField()).eql(
            code,
        )
    })
}

regressionTest(
    () => test,
    'somewhatComplicatedRegression',
    `regr = regression(y=commute_transit, x1=ln(density_pw_1km), weight=population);
condition (population > 10000)
cMap(data=do { x = regr.residuals; x }, scale=linearScale(max=0.1, center=0), ramp=rampUridis, label="Commute Transit above expectation based on ln(density) [%]", basemap=noBasemap(), outline=constructOutline(color=rgb(0, 0.21568627450980393, 1), weight=0.2))
`,
)

regressionTest(
    () => test,
    'densityPointMap',
    `pMap(data=density_pw_1km, scale=logScale(min=100, max=5000), ramp=rampUridis, relativeArea=population, maxRadius=20, basemap=noBasemap())\n`,
)

regressionTest(
    () => test,
    'rgbMap',
    `cMapRGB(dataR=minimum(10 * commute_transit, 1), dataG=minimum(10 * commute_bike, 1), dataB=minimum(10 * commute_walk, 1), label="R=Commute Transit, G=Commute Bike, B=Commute Walk; maximum=10%", basemap=noBasemap())\n`,
)

regressionTest(
    () => test,
    'textBoxesMap',
    `nonFilteredPopulation = sum(population);
condition (population > 10000000)
cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, textBoxes=[textBox(screenBounds={north: 1, east: 0.28955642611994215, south: 0.8888666610512129, west: 0}, text=rtfDocument([
    rtfString("There are ", font="Arial", italic=true),
    rtfString(toString(round(10000 * sum(population) / nonFilteredPopulation) / 100), bold=true, font="Courier"),
    rtfString("% of people represented in this map", strike=true)
])), textBox(screenBounds={north: 0.5, east: 0.95, south: 0.1, west: 0.7}, borderColor=hsv(50, 1, 1), backgroundColor=rgb(0.9, 0.9, 0.7), text=rtfDocument([
    rtfFormula("f(\\relax{x}) = \\int_{-\\infty}^\\infty \\hat f(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi"),
    rtfString("\n\n", align=alignCenter),
    rtfImage("https://http.cat/images/409.jpg")
]))])`,
)
