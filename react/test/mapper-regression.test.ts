import { downloadPNG, getCodeFromMainField, getErrors, toggleCustomScript } from './mapper-utils'
import { urbanstatsFixture } from './test_utils'

const urls = {
    'somewhatComplicatedRegression': '/mapper.html?settings=H4sIAAAAAAAAA1VQ22rDMAz9FWEYOGBK0q5dL3iw7XFse%2Bj2tIziOCI1S2zjS5tS%2Bu9z2kGpH%2BSjoyN0pCNp0DRO2O3hVemaLMmLiTocCCNRqx06j4n7Wj8lwkunbCDLI4neJ1ZGH0z3bmqkJXHYOOAwfOi9MpoeuDRdFwNughPaq8CgL3iraY1DdtjY%2Fab47TIGe1TNNnBrbGxFSL1ZSbJVqaXRtRpyoDezrkJ4hCJPL%2BmzpH8TltYiCH4j7%2F99jZIzVUfR%2BlVZ6j71MPBStMhbpVG49YBpJ3qejwoGEnVAx%2FOkcqKzfAhfTtXKM2hFhS0v07HOG8LnZUMQldkhYG9RhovBSnisIYHr4hl83%2F2UhJ1rnbBcm%2BcLommWiWGwk46nfXBRho8LQaVpjeOuqWjOIB%2BNi%2BlsPhs%2F3E%2FzxTyfLCYMiustUz3LyOn0Bx84HTfgAQAA',
    'densityPointMap': '/mapper.html?settings=H4sIAAAAAAAAAyWOwWrDMBBEf8XoJIEPTqGXFB3SHktzSMjNELbW4i61doVWamtC%2Fr1yexlmHswwNzOjzBnSx%2FpKHMzevEjlspreVKYvzIqNXc6HBnTKlIrZ30xVbXSqWiQeJaAdzWjc08iTcKBCwp0tuaIbOb1BsgEK%2BICsVNZr%2Br7uPmPf6QQL%2BkXm82ZsJPa7Yei7CD%2F%2BcRgG13cZYvKbXDIF0gZwgdJuHTKCT5LqFoX%2FSicIVNU%2FtIl3UIyQPMvzv7POmfv9FxjLSortAAAA',
    'rgbMap': '/mapper.html?settings=H4sIAAAAAAAAA42OsWrDMBCGX0UcFKTiIV4TNFQZPJR2cBO6CMrZFqmIJRnp1CSEvHuVhhqyZbv7fr7%2F7gw7E3YRp%2B%2FTq%2FUDLGEdsqcTVJC9%2FTExmcK2Hy8FpD7aiWB5hpxSoX1OFNx7GAzXoEGstO%2BDHyzZ4BmnmI0o5A2ntlF8QMJW3inOeuuy4%2FWCPbM%2BOJfJfFFEnyxVrBalsmJXr3nA6%2Bze3EnqAemA436WRuzMKDW0cn2L2eb%2Fl2ZG6u%2BMmvfP0rBiDo%2FXclkvnjRUrMNkHE7SB3WbuBBwufwCmMvBE2wBAAA%3D',
    'textBoxesMap': '/mapper.html?settings=H4sIAAAAAAAAA3VTa2vbMBT9KxfDwB6eH6FJmwwP2o7CGBtlWT%2FVbVDta1uLLQlJXlKC%2F%2Fuu7JK2Wyds5T6le85xDl6NstZMNY9fuSi9lbfuHwSzXArWwg%2BsyfBCrxf8N2qDlL9Zn1PAFJor660OXm8MRYveWNl9lyX6uSekuOKtRY3ltVR9Ox4HGZi%2B89UxEORe8DEXhRQlHwv8V4c8F8InSJNpUUtALd%2BY8ktmWVaiMNw%2BbtRuk267EEzBWsxaLpDptbP9IATNOpW57UbzkpsQLO7thdyjyW6fTJ%2FwIIoL2YvSZAchtW1WkIaAzNgVJNHsbDmfL05mizRdLk9m6Zzukr0rSqIzWgtaaTJPZ%2BlsGcIOx65huirTtvosi75DYf1bctZWc1ETxp8NcQSM3twLoZLCZrl3rjlrnc8ta3mRWd2jQ3Hse0WTlU9RX7vh%2FZEpeA%2F%2BX2QHEMObuowZ6nJyhPAg23K88TjOpew1Rz1mX87%2BDmQFCqVqETQqjYbgYQlcgG24gY4pB8JQ%2FRYnEHdBcCT%2FbcaTaP7M%2BfIlyemR1eh0cHPqEvWlbKXOGvPbnyehkyt1EFixrUcyprSuH3w6LISn7TT4jyxXUndECmGr%2FJyWxpbtD%2FshoE%2FX%2BVzYzeHDZFX2cbg%2FmmO6YRamxj0P3E%2BI94fZmFIcOEwZ2A9jrpzcf2jNc%2BEeYo7Er0U27peOWj1VfulY7YRvrFVmFce9aiUrox3f8g5LziKp69h5ynlxIbtOChNXcbWI6f%2FctyTmDhu9uSbKk3STnEW%2FVE1zkDp3gTcMfwC2V6bcEwQAAA%3D%3D',
    'textBoxesMap-corsError': '/mapper.html?settings=H4sIAAAAAAAAA3VSYWvbQAz9K8IwOA8vsUPSNhketB2FMTbGsn6q23CxFftW%2B%2B64O7cJxv99Oruk7dYJ%2ByzpSTrpyV1QoioN19Xhq5BFsArW7VZyJ5TkNfzEkpQgClopHtBYJPx6fU4OmxuhXbDqgtZa8uatdar5rgpkWSCVvBK1Q4PFD6XbeigHKdi2YfroCLMg%2FJjJXMlCDAHsVZHnQPgESTwKpYSU8o1rVnDH0wKlFe6w0Y%2Bb5L6JwOa8xrQWErlZe52FERje6NQf10YUwkbgcO8u1B5tevOkMpoHUV6oVhY27aQyrlpBEgFy61YQT2Zny8XiZD47SZLlcj5LFnSXan1QPDkjOSFJ4kUyS2bLCB5xyOrHq1Ljdp9V3jYoHbshY%2B2MkCXN%2BKsijoDTmwUR7JR0aRacG8FrbwvHa5GnzrTopzjmvaLJqScvM755NjAF74H9RXYIU3hzLwNCWX4dEWxVXQw3Htu5VK0RaAb0Ze%2FvQO1Ao9I1gkFt0NJ4WICQ4CphoeHaD2Ep%2Fh7HIW7D8Ej%2B24zHk8Uz58uXJCdHVienve%2FTFGguVa1MWtkHtogjv67Ej8Dz%2B3IgY4RNuWVULIKn4zT8z1qulGmIFJptxzISgzXfd%2Fs%2BpF%2FX20K6Tfdh1Hbu0N8d1QGuuIMxcS9C%2F4nwrpsNkBYgYERg3w9YMZr%2F0Jpl0j%2FEHC2%2FlOlwXnpqzRj5peGlX3zlnLar6dR%2FJzl3U%2BEBO53Hy8lvXVJhovs2DPr%2BD2Jy6JvkAwAA',

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
                    "f(\\\\relax{x}) = \\\\int_{-\\\\infty}^\\\\infty \\\\hat f(\\\\xi)\\\\,e^{2 \\\\pi i \\\\xi x}\\\\,d\\\\xi"
                ),
                rtfString("\\n\\n", align=alignCenter),
                rtfImage(
                    "https://upload.wikimedia.org/wikipedia/commons/f/f6/Regulierwehr_Port01_08.jpg"
                )
            ])
        )
    ]
)
`)

regressionTest(
    () => test,
    'textBoxesMap-corsError',
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
                    "f(\\\\relax{x}) = \\\\int_{-\\\\infty}^\\\\infty \\\\hat f(\\\\xi)\\\\,e^{2 \\\\pi i \\\\xi x}\\\\,d\\\\xi"
                ),
                rtfString("\\n\\n", align=alignCenter),
                rtfImage("https://http.cat/images/409.jpg")
            ])
        )
    ]
)
`)
