import { testCode } from './mapper-utils'

const clusterMapBasic = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapBasic, 'cluster-map-basic')

const clusterMapWeightedByArea = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    relativeArea=area,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapWeightedByArea, 'cluster-map-weight-by-area')

const clusterMapCommuteTransitPopulation = `
clusterMap(
    data=commute_transit,
    scale=linearScale(max=0.25),
    ramp=rampUridis,
    maxRadius=60,
    relativeArea=population
)
`

testCode(() => test, 'County', 'USA', clusterMapCommuteTransitPopulation, 'cluster-map-commute-transit-population')

const clusterMapCommuteTransitArea = `
clusterMap(
    data=commute_transit,
    scale=linearScale(max=0.25),
    ramp=rampUridis,
    maxRadius=60,
    relativeArea=area
)
`

testCode(() => test, 'County', 'USA', clusterMapCommuteTransitArea, 'cluster-map-commute-transit-area')

const clusterMapRampBone = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampBone,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapRampBone, 'cluster-map-ramp-bone')

const clusterMapRampViridis = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampViridis,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapRampViridis, 'cluster-map-ramp-viridis')

const clusterMapOpacity = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    opacity=0.45,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapOpacity, 'cluster-map-opacity')

const clusterMapMaxRadius = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    maxRadius=100,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapMaxRadius, 'cluster-map-max-radius')

const clusterMapClusterSpacing = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    clusterRadiusSpacing=100,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapClusterSpacing, 'cluster-map-cluster-spacing')

const asymmetricCenterValue = `
cMap(
    data=density_pw_1km,
    scale=linearScale(center=9000, max=9005, min=0),
    ramp=rampUridis
)`

testCode(() => test, 'Subnational Region', 'USA', asymmetricCenterValue, 'asymmetric-center-value')

testCode(() => test, 'Subnational Region', 'USA', `cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    label="Multiline\\nLabel",
    basemap=noBasemap()
)`, 'multiline-label')

const negativeDefaultValue = `
condition (white > 0.7 & density_pw_1km < 1000)
cMap(
    data=pres_2020_margin,
    scale=linearScale(max=0, min=-0.75),
    ramp=rampUridis,
    basemap=noBasemap(backgroundColor=colorBlack),
    label="2020 Presidential Election Margin, among CCDs with 70%+ white and Density < 1000/km2",
    unit=unitDemocraticMargin
)`

testCode(() => test, 'County', 'USA', negativeDefaultValue, 'negative-default-value', true)

testCode(() => test, 'Subnational Region', 'USA', `cMap(
    data=log10(density_pw_1km),
    scale=linearScale(),
    ramp=rampUridis,
    label="log_{10}(Density)^{2}",
    basemap=noBasemap()
)`, 'label-with-subscript-superscript')
