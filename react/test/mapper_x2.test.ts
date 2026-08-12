import { testCode } from './mapper-utils'

const cMapRGBWithAlphaChannelAndGlobalOpacity = `
cMapRGB(
    dataR=commute_car,
    dataG=commute_transit,
    dataB=commute_walk,
    dataA=population / (max(population)),
    label="RGB Map with Alpha Channel",
    basemap=noBasemap(),
    opacity=0.5
)
`

testCode(() => test, 'County', 'USA', cMapRGBWithAlphaChannelAndGlobalOpacity, 'cmaprgb-alpha-channel-and-global-opacity')

const translucentOutline = `
cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    outline=constructOutline(
        color=rgb(0.8980392156862745, 0.12156862745098039, 0.12156862745098039, a=0.6),
        weight=10
    ),
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'USA', translucentOutline, 'translucent-outline')

const codeWithRegression = `
regr = regression(y=commute_transit, x1=ln(density_pw_1km), weight=population);
condition (population > 200000)
cMap(
    data=regr.residuals,
    scale=linearScale(center=0, max=0.1),
    ramp=rampUridis,
    label="Commute Transit % above or below prediction based on density",
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'USA', codeWithRegression, 'code-with-regression', true)

const codeSetCenterWithExpression = `
cMap(
    data=arthritis,
    scale=linearScale(center=mean(arthritis)),
    ramp=rampUridis,
    unit=unitPercentage,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', codeSetCenterWithExpression, 'code-set-center-with-expression', true)

const translucentOutlineCustomBackground = `
cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    outline=constructOutline(
        color=rgb(0.8980392156862745, 0.12156862745098039, 0.12156862745098039, a=0.6),
        weight=10
    ),
    basemap=noBasemap(backgroundColor=rgb(0.7, 0.3, 0.2, a=0.5))
)
`

testCode(() => test, 'County', 'USA', translucentOutlineCustomBackground, 'translucent-outline-custom-background')

const translucentOutlineCustomBackgroundAndTextColor = `
cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    outline=constructOutline(
        color=rgb(0.8980392156862745, 0.12156862745098039, 0.12156862745098039, a=0.6),
        weight=10
    ),
    basemap=noBasemap(backgroundColor=rgb(0.7, 0.3, 0.2, a=0.5), textColor=rgb(1, 1, 1))
)
`

testCode(() => test, 'County', 'USA', translucentOutlineCustomBackgroundAndTextColor, 'translucent-outline-custom-background-and-text-color')

const rgbMap = `
cMapRGB(
    dataR=commute_car,
    dataG=commute_transit,
    dataB=commute_walk,
    label="RGB Map: Density (R), Transit (G), Walk (B)",
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', rgbMap, 'rgb-map')
