import { testCode } from './mapper-utils'

const codeFiltered = `
regr = regression(y=commute_transit, x1=ln(density_pw_1km), weight=population);
condition (population > 10000)
cMap(
    data=do { x = regr.residuals; x },
    scale=linearScale(max=0.1, center=0),
    ramp=rampUridis,
    label="Commute Transit above expectation based on ln(density) [%]",
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', codeFiltered, 'code-filtered')

const withOutline = `
cMap(
    data=density_pw_1km,
    scale=logScale(),
    ramp=rampUridis,
    outline=constructOutline(),
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', withOutline, 'with-outline')

const indiaEg = `
cMap(
    data=density_pw_1km,
    scale=logScale(),
    ramp=rampUridis,
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'India', indiaEg, 'india-eg')

const pointMap = `
pMap(data=hilliness, scale=linearScale(), ramp=rampUridis, basemap=noBasemap())
`

testCode(() => test, 'Urban Center', 'USA', pointMap, 'point-map')

const cMapWithGlobalOpacity = `
cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=constructRamp([
        {value: 0, color: rgb(0.1, 0.2, 0.9, a=0)},
        {value: 1, color: rgb(0.9, 0.2, 0.1, a=1)}
    ]),
    opacity=0.5,
    outline=constructOutline(color=rgb(0, 0, 0, a=0.7), weight=2),
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', cMapWithGlobalOpacity, 'cmap-global-opacity')

const pMapWithGlobalOpacity = `
pMap(
    data=hilliness,
    scale=linearScale(),
    ramp=constructRamp([
        {value: 0, color: rgb(0.05, 0.3, 0.8, a=0.35)},
        {value: 1, color: rgb(0.95, 0.8, 0.2, a=0.9)}
    ]),
    opacity=0.4,
    maxRadius=12,
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'USA', pMapWithGlobalOpacity, 'pmap-global-opacity')

const cMapRGBWithGlobalOpacity = `
cMapRGB(
    dataR=commute_car,
    dataG=commute_transit,
    dataB=commute_walk,
    opacity=0.45,
    label="RGB Map with Opacity",
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', cMapRGBWithGlobalOpacity, 'cmaprgb-global-opacity')

const cMapRGBWithAlphaChannel = `
cMapRGB(
    dataR=commute_car,
    dataG=commute_transit,
    dataB=commute_walk,
    dataA=population / (max(population)),
    label="RGB Map with Alpha Channel",
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', cMapRGBWithAlphaChannel, 'cmaprgb-alpha-channel')
