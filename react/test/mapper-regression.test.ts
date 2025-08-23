import { downloadPNG, getCodeFromMainField, getErrors, toggleCustomScript } from './mapper-utils'
import { urbanstatsFixture } from './test_utils'

const urls = {
    somewhatComplicatedRegression: '/mapper.html?settings=H4sIAAAAAAAAA1VQ22rDMAz9FWEYOGBK0q5dL3iw7XFse%2Bj2tIziOCI1S2zjS5tS%2Bu9z2kGpH%2BSjoyN0pCNp0DRO2O3hVemaLMmLiTocCCNRqx06j4n7Wj8lwkunbCDLI4neJ1ZGH0z3bmqkJXHYOOAwfOi9MpoeuDRdFwNughPaq8CgL3iraY1DdtjY%2Fab47TIGe1TNNnBrbGxFSL1ZSbJVqaXRtRpyoDezrkJ4hCJPL%2BmzpH8TltYiCH4j7%2F99jZIzVUfR%2BlVZ6j71MPBStMhbpVG49YBpJ3qejwoGEnVAx%2FOkcqKzfAhfTtXKM2hFhS0v07HOG8LnZUMQldkhYG9RhovBSnisIYHr4hl83%2F2UhJ1rnbBcm%2BcLommWiWGwk46nfXBRho8LQaVpjeOuqWjOIB%2BNi%2BlsPhs%2F3E%2FzxTyfLCYMiustUz3LyOn0Bx84HTfgAQAA',
    densityPointMap: '/mapper.html?settings=H4sIAAAAAAAAAx3OQWvDMAwF4L8SdEogB3ewS4cPZcfRHVZ6CxQRi0wsloxlbwul%2F33OLuK9Dx7oDgvpkjF9bm8sAY7wqlXKBiNU4W%2FKRs2ul1MDmzOnAsc7VLOmc7Wi8V0D9RNMMLxMMqsELqzS9SVXGiZJZ0x9wII%2BkBiX7ZZ%2BboevOHY240p%2B1eWyhz6y%2BINzYxfx1z8754axyxiT3881c2BrQCuW9tYpE%2Fqkqe5V5X%2F0gYGr%2BSc3wOPxB6062dTYAAAA',
} as const

function regressionTest(name: keyof typeof urls, code: string): void {
    urbanstatsFixture(name, urls[name])

    test(name, async (t) => {
        await t.expect(await getErrors()).eql([])
        await downloadPNG(t)
        await toggleCustomScript(t)
        await t.expect(await getErrors()).eql([])
        await t.expect(await getCodeFromMainField()).eql(
            code,
        )
    })
}

regressionTest(
    'somewhatComplicatedRegression',
    `regr = regression(y=commute_transit, x1=ln(density_pw_1km), weight=population);
condition (population > 10000)
cMap(data=do { x = regr.residuals; x }, scale=linearScale(max=0.1, center=0), ramp=rampUridis, label="Commute Transit above expectation based on ln(density) [%]", basemap=noBasemap(), outline=constructOutline(color=rgb(0, 0.21568627450980393, 1), weight=0.2))
`,
)

regressionTest(
    'densityPointMap',
    `pMap(data=density_pw_1km, scale=logScale(min=100, max=5000), ramp=rampUridis, relativeArea=population, maxRadius=20)\n`,
)
