import { downloadPNG, getCodeFromMainField, getErrors, toggleCustomScript } from './mapper-utils'
import { urbanstatsFixture } from './test_utils'

const urls = {
    'somewhatComplicatedRegression': '/mapper.html?settings=H4sIAAAAAAAAA1VQ22rDMAz9FWEYOGBK0q5dL3iw7XFse%2Bj2tIziOCI1S2zjS5tS%2Bu9z2kGpH%2BSjoyN0pCNp0DRO2O3hVemaLMmLiTocCCNRqx06j4n7Wj8lwkunbCDLI4neJ1ZGH0z3bmqkJXHYOOAwfOi9MpoeuDRdFwNughPaq8CgL3iraY1DdtjY%2Fab47TIGe1TNNnBrbGxFSL1ZSbJVqaXRtRpyoDezrkJ4hCJPL%2BmzpH8TltYiCH4j7%2F99jZIzVUfR%2BlVZ6j71MPBStMhbpVG49YBpJ3qejwoGEnVAx%2FOkcqKzfAhfTtXKM2hFhS0v07HOG8LnZUMQldkhYG9RhovBSnisIYHr4hl83%2F2UhJ1rnbBcm%2BcLommWiWGwk46nfXBRho8LQaVpjeOuqWjOIB%2BNi%2BlsPhs%2F3E%2FzxTyfLCYMiustUz3LyOn0Bx84HTfgAQAA',
    'densityPointMap': '/mapper.html?settings=H4sIAAAAAAAAAyWOwWrDMBBEf8XoJIEPTqGXFB3SHktzSMjNELbW4i61doVWamtC%2Fr1yexlmHswwNzOjzBnSx%2FpKHMzevEjlspreVKYvzIqNXc6HBnTKlIrZ30xVbXSqWiQeJaAdzWjc08iTcKBCwp0tuaIbOb1BsgEK%2BICsVNZr%2Br7uPmPf6QQL%2BkXm82ZsJPa7Yei7CD%2F%2BcRgG13cZYvKbXDIF0gZwgdJuHTKCT5LqFoX%2FSicIVNU%2FtIl3UIyQPMvzv7POmfv9FxjLSortAAAA',
    'rgbMap': '/mapper.html?settings=H4sIAAAAAAAAA42OsWrDMBCGX0UcFKTiIV4TNFQZPJR2cBO6CMrZFqmIJRnp1CSEvHuVhhqyZbv7fr7%2F7gw7E3YRp%2B%2FTq%2FUDLGEdsqcTVJC9%2FTExmcK2Hy8FpD7aiWB5hpxSoX1OFNx7GAzXoEGstO%2BDHyzZ4BmnmI0o5A2ntlF8QMJW3inOeuuy4%2FWCPbM%2BOJfJfFFEnyxVrBalsmJXr3nA6%2Bze3EnqAemA436WRuzMKDW0cn2L2eb%2Fl2ZG6u%2BMmvfP0rBiDo%2FXclkvnjRUrMNkHE7SB3WbuBBwufwCmMvBE2wBAAA%3D',
    'textBoxesMap': '/mapper.html?settings=H4sIAAAAAAAAA51UbWvbMBD%2BK0IwsIfnl9CkTYYHbUdhjI2yrJ%2FqNij2xdZiS0KSm4SQ%2Fz7J9tK8bmWHLd%2Fdc3fW6R57jXPguSSiWH2lLMMjPK6njGjKGSnRD8iNgj1cM%2FoCUoHBH8bXxqFSSYXGozWulTLetFaaV995Bk6CGWd3tNQgIbvnoi6bcihGqq4csXW4CXY%2FJizlLKNNgLNX5DUQfUJR2IpJcU3KNyKchCEjGdEkzoApqlcTsZhE88prEZWSEuKSMiBybHXH7RBJKhHb5UHSjKrOq2Gpb%2FgSVPzYOnaczqunLS0B2A2vWabi9T5mhXGpixGKvGMIiNIjFPq9q2G%2FP7joDaJoOLzoRf0TsYrXtkzoXxkZGInCftSLesMTsQto6u4Dm4NA200s9ewzT%2BsKmHYejwsZeKwlZbkZwc%2FCjBARcyfYQzPOdJzga0lJaW2qSUnTWMsa3BM72il0hFnZG7bmXawj7ak6zbzRe%2BQcUMZFATrJrgYxWZZUJzZjZcrLrNntGbzr75bXkoJM8HHUP9rE7xCfIQFclIAkCAnKHDJkiDKkC6pQRYQ9OGXi59Ae3H7Bpx1792VvoWFHutDve1uWDY2%2BZVHk%2FWGJf3nIjCmXGchbXnIZF%2BrF6YeeoS%2BKDjueknSeNyNqY2U%2BdcxrPNQtl4cJb6TcHZeVmeQZqiR45iRGJJRkuV5uXPMvsTZlerL%2B0Gozvdo8b9UGLohGbeKSuvbhwfO610CCIopaBC03DZa15v%2FMPUmYvcxozReRs7hZb%2B3s5ZnULxXJ4Wy3hdZCjYKgFiUnmb%2Bgc1pBRonPZR5YS1grSHlVcaaCWTAbBOZXXZeGtwso5OTecCGMJuGV%2F0vkJzv6C%2B9a9anb%2BJQoMLyNGb9pNccEuHiz%2BQ1fsC6OOgYAAA%3D%3D',
    'textBoxesMap-corsError': '/mapper.html?settings=H4sIAAAAAAAAA51UbWvbMBD%2BK0IwkIeX2KFpmwwP2o7CGCtjWT%2FVbVHsi6PVloQktykh%2F30n20vz1q3ssOXTPc%2BdXu5JlrQAVRiu589fhczpmE7qqeROKMlL8gMKdGhIaykewVhA%2FHpyhgGbGaEdHS9pbS1Gs9o6VV2pHFhKpZKXonRgIP%2BudF025UhCbF0xvQ4EKQ0%2BpjJTMhcNgW0VeSGSTySOWsOUAFO%2Bcc1SSdBy7niSg7TCPd%2Frp%2Fv4oQpbxGa8hKQUEriZeJ8FHWJ4pRM%2FXBuRC9tFHSzcuVqATW7awEaQvUTa0gZAnqta5jZZbmPepDJuPiZxuA8Bt25Mot7gdDQcHh8NjuN4NDoaxMMDXKtqXybqnaIdo8XRMB7Eg9EB7hM0dbeB1Q7RnyYxbvZZZXUF0rGb%2FUIIT5wRssAW%2FJxjCwnHN6UhmSnpkpSeGcFLPxeOlyJLnKkhOLCjjUJ7mLetZjvVcZnxt8qafpP3hO1IJiB9clBdDYJZXlQHNuNtqsq82e0reHe%2BC1UbASal%2B6x%2FHJO%2BI2pGNChdAjGgDVi8ZMiJkMTNhSUV1%2F7iLPIfoL247YK3G%2FPNxd4iw050UW8YrlU2Qn%2Btojj8o5Leya4ypsrkYC5UqUwyt49sGIUoXxLvnnjKs4eiaVHLNcWU4TIh6YaT3YQ3Su5SmQo7%2BYpUUjpjKZqBki%2BWi1WA%2FyV%2BLqS7X35ovZl7Xt2t3Qaec0faxIUI%2FCeEu%2BWggbQggrQIWawaLG%2Bn%2F9P3NJX%2BwdbiL6KQSTNe%2BN6bV1K%2FVLzwup87p%2B243%2FffXsZdX3jA9o%2BiUe%2BXLlDMfxFI6952K0y5BRRYItV56zEkBHS1%2Bg0Q5%2Bo14wUAAA%3D%3D',

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
cMap(
    data=do { x = regr.residuals; x },
    scale=linearScale(max=0.1, center=0),
    ramp=rampUridis,
    label="Commute Transit above expectation based on ln(density) [%]",
    basemap=noBasemap(),
    outline=constructOutline(color=rgb(0, 0.21568627450980393, 1), weight=0.2)
)
`,
)

regressionTest(
    () => test,
    'densityPointMap',
    `pMap(
    data=density_pw_1km,
    scale=logScale(min=100, max=5000),
    ramp=rampUridis,
    relativeArea=population,
    maxRadius=20,
    basemap=noBasemap()
)\n`,
)

regressionTest(
    () => test,
    'rgbMap',
    `cMapRGB(
    dataR=minimum(10 * commute_transit, 1),
    dataG=minimum(10 * commute_bike, 1),
    dataB=minimum(10 * commute_walk, 1),
    label="R=Commute Transit, G=Commute Bike, B=Commute Walk; maximum=10%",
    basemap=noBasemap()
)\n`,
)

regressionTest(
    () => test,
    'textBoxesMap',
    `nonFilteredPopulation = sum(population);
condition (population > 10000000)
cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    textBoxes=[
        textBox(
            screenBounds={
                north: 1,
                east: 0.28955642611994215,
                south: 0.8888666610512129,
                west: 0
            },
            text=rtfDocument([
                rtfString("There are ", font="Arial", italic=true),
                rtfString(
                    toString((round(10000 * (sum(population)) / nonFilteredPopulation)) / 100),
                    bold=true,
                    font="Courier"
                ),
                rtfString("% of people represented in this map", strike=true)
            ])
        ),
        textBox(
            screenBounds={north: 0.5, east: 0.95, south: 0.1, west: 0.7},
            borderColor=hsv(50, 1, 1),
            backgroundColor=rgb(0.9, 0.9, 0.7),
            text=rtfDocument([
                rtfFormula(
                    "f(\\relax{x}) = \\int_{-\\infty}^\\infty \\hat f(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi"
                ),
                rtfString("\n\n", align=alignCenter),
                rtfImage(
                    "https://upload.wikimedia.org/wikipedia/commons/f/f6/Regulierwehr_Port01_08.jpg"
                )
            ])
        )
    ],
    basemap=noBasemap()
)
`)

regressionTest(
    () => test,
    'textBoxesMap-corsError',
    `nonFilteredPopulation = sum(population);
condition (population > 10000000)
cMap(
    data=density_pw_1km
,
    scale=linearScale(),
    ramp=rampUridis,
    textBoxes=[
        textBox(
            screenBounds={
                north: 1,
                east: 0.28955642611994215,
                south: 0.8888666610512129,
                west: 0
            },
            text=rtfDocument([
                rtfString("There are ", font="Arial", italic=true),
                rtfString(
                    toString((round(10000 * (sum(population)) / nonFilteredPopulation)) / 100),
                    bold=true,
                    font="Courier"
                ),
                rtfString("% of people represented in this map", strike=true)
            ])
        ),
        textBox(
            screenBounds={north: 0.5, east: 0.95, south: 0.1, west: 0.7},
            borderColor=hsv(50, 1, 1),
            backgroundColor=rgb(0.9, 0.9, 0.7),
            text=rtfDocument([
                rtfFormula(
                    "f(\\relax{x}) = \\int_{-\\infty}^\\infty \\hat f(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi"
                ),
                rtfString("\n\n", align=alignCenter),
                rtfImage("https://http.cat/images/409.jpg")
            ])
        )
    ],
    basemap=noBasemap()
)
`)
