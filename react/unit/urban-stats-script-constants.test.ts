import assert from 'assert/strict'
import { test } from 'node:test'

import { round } from 'mathjs'

import { Color, deconstructColor, doRender } from '../src/urban-stats-script/constants/color-utils'
import { constantsByType, defaultConstants } from '../src/urban-stats-script/constants/constants'
import { Context } from '../src/urban-stats-script/context'
import { evaluate, InterpretationError } from '../src/urban-stats-script/interpreter'
import { LocInfo } from '../src/urban-stats-script/location'
import { USSRawValue } from '../src/urban-stats-script/types-values'

void test('constant listing', (): void => {
    assert.deepStrictEqual(
        constantsByType(),
        {
            'boolean': [
                'true',
                'false',
            ],
            'null': [
                'null',
            ],
            'number': [
                'inf',
                'pi',
                'E',
                'NaN',
            ],
            'color': [
                'colorBlue',
                'colorOrange',
                'colorBrown',
                'colorPurple',
                'colorRed',
                'colorGrey',
                'colorDarkGrey',
                'colorPink',
                'colorYellow',
                'colorGreen',
                'colorCyan',
                'colorWhite',
                'colorBlack',
            ],
            '(string; size: number = null, font: string = null, color: color = null, bold: boolean = null, italic: boolean = null, underline: boolean = null, strike: boolean = null, list: richTextList = null, indent: number = null, align: richTextAlign = null) -> richTextSegment': [
                'rtfString',
                'rtfFormula',
                'rtfImage',
            ],
            'Unit': [
                'unitPercentage',
                'unitFatalities',
                'unitFatalitiesPerCapita',
                'unitDensity',
                'unitPopulation',
                'unitArea',
                'unitDistanceInKm',
                'unitDistanceInM',
                'unitDemocraticMargin',
                'unitTemperature',
                'unitTime',
                'unitDistancePerYear',
                'unitContaminantLevel',
                'unitNumber',
                'unitUsd',
                'unitMinutes',
                'unitPartyPctBlue',
                'unitPartyPctRed',
                'unitPartyPctOrange',
                'unitPartyPctTeal',
                'unitPartyPctGreen',
                'unitPartyPctPurple',
                'unitPartyChangeBlue',
                'unitPartyChangeRed',
                'unitPartyChangeOrange',
                'unitPartyChangeTeal',
                'unitPartyChangeGreen',
                'unitPartyChangePurple',
                'unitLeftMargin',
            ],
            '(number; ) -> number': [
                'abs',
                'sqrt',
                'ln',
                'log10',
                'log2',
                'sin',
                'cos',
                'tan',
                'asin',
                'acos',
                'atan',
                'ceil',
                'floor',
                'round',
                'exp',
                'sign',
                'nanTo0',
            ],
            '(number, number; ) -> number': [
                'maximum',
                'minimum',
            ],
            '([number]; ) -> number': [
                'sum',
                'min',
                'max',
            ],
            '([number]; weights: [number] = null) -> number': [
                'mean',
                'median',
            ],
            '([number], number; weights: [number] = null) -> number': [
                'quantile',
                'percentile',
            ],

            '(any; ) -> number': [
                'toNumber',
            ],
            '(any; ) -> string': [
                'toString',
            ],
            '(; screenBounds: {east: number, north: number, south: number, west: number}, text: richTextDocument, backgroundColor: color = rgb(1, 0.973, 0.941), borderColor: color = rgb(0.2, 0.2, 0.2), borderWidth: number = 1) -> textBox': [
                'textBox',
            ],
            '(; values: [number], name: string = null, unit: Unit = null) -> column': [
                'column',
            ],
            '(; geo: [geoFeatureHandle] = geo, population: [number] = population, columns: [column], hideOrdinalsPercentiles: boolean = false, title: string = null) -> table': [
                'table',
            ],
            '(; y: [number], x1: [number], x2: [number] = null, x3: [number] = null, x4: [number] = null, x5: [number] = null, x6: [number] = null, x7: [number] = null, x8: [number] = null, x9: [number] = null, x10: [number] = null, weight: [number] = null, noIntercept: boolean = false) -> {b: number, m1: number, m10: number, m2: number, m3: number, m4: number, m5: number, m6: number, m7: number, m8: number, m9: number, r2: number, residuals: [number]}': [
                'regression',
            ],
            '(number, number, number; a: number = 1) -> color': [
                'rgb',
                'hsv',
            ],
            '(color; ) -> string': [
                'renderColor',
            ],
            '([richTextSegment]; ) -> richTextDocument': [
                'rtfDocument',
            ],
            '([{color: color, value: number}]; ) -> ramp': [
                'constructRamp',
            ],
            '(ramp; ) -> ramp': [
                'reverseRamp',
            ],
            '(; first: color, middle: color = colorWhite, last: color) -> ramp': [
                'divergingRamp',
            ],
            'ramp': [
                'rampUridis',
                'rampMagma',
                'rampInferno',
                'rampPlasma',
                'rampViridis',
                'rampCividis',
                'rampTwilight',
                'rampTwilightShifted',
                'rampTurbo',
                'rampCMRmap',
                'rampWistia',
                'rampAfmhot',
                'rampAutumn',
                'rampBinary',
                'rampBone',
                'rampCool',
                'rampCopper',
                'rampCubehelix',
                'rampGistEarth',
                'rampGistGray',
                'rampGistHeat',
                'rampGistNcar',
                'rampGistRainbow',
                'rampGistStern',
                'rampGistYarg',
                'rampGnuplot',
                'rampGnuplot2',
                'rampGray',
                'rampHot',
                'rampJet',
                'rampNipySpectral',
                'rampOcean',
                'rampPink',
                'rampRainbow',
                'rampSpring',
                'rampSummer',
                'rampTerrain',
                'rampWinter',
                'rampBlues',
                'rampBuGn',
                'rampBuPu',
                'rampGnBu',
                'rampGreens',
                'rampGreys',
                'rampOrRd',
                'rampOranges',
                'rampPuBu',
                'rampPuBuGn',
                'rampPuRd',
                'rampPurples',
                'rampRdPu',
                'rampReds',
                'rampYlGn',
                'rampYlGnBu',
                'rampYlOrBr',
                'rampYlOrRd',
                'rampBrg',
                'rampBrBG',
                'rampPRGn',
                'rampPiYG',
                'rampPuOr',
                'rampRdBu',
                'rampRdGy',
                'rampRdYlBu',
                'rampRdYlGn',
                'rampSpectral',
                'rampBwr',
                'rampCoolwarm',
                'rampSeismic',
            ],
            '(; screenBounds: {east: number, north: number, south: number, west: number}, mapBounds: {east: number, north: number, south: number, west: number}, mainMap: boolean, name: string) -> inset': [
                'constructInset',
            ],
            '([inset]; ) -> insets': [
                'constructInsets',
            ],
            'inset': [
                'insetworld',
                'insetAfrica',
                'insetAsia',
                'insetEurope',
                'insetNorthAmerica',
                'insetOceania',
                'insetSouthAmerica',
                'insetAndorra',
                'insetUnitedArabEmirates',
                'insetAfghanistan',
                'insetAntigua',
                'insetBarbuda',
                'insetAnguilla',
                'insetAlbania',
                'insetArmenia',
                'insetAngola',
                'insetArgentina',
                'insetAustria',
                'insetAustralia',
                'insetAruba',
                'insetAzerbaijan',
                'insetBosniaandHerzegovina',
                'insetBarbados',
                'insetBangladesh',
                'insetBelgium',
                'insetBurkinaFaso',
                'insetBulgaria',
                'insetBahrain',
                'insetBurundi',
                'insetBenin',
                'insetBermuda',
                'insetBrunei',
                'insetBolivia',
                'insetBrazil',
                'insetTheBahamas',
                'insetBhutan',
                'insetBotswana',
                'insetBelarus',
                'insetBelize',
                'insetCanada',
                'insetCocosKeelingIslands',
                'insetDemocraticRepublicoftheCongo',
                'insetCentralAfricanRepublic',
                'insetCongo',
                'insetSwitzerland',
                'insetIvoryCoast',
                'insetCookIslands',
                'insetChile',
                'insetCameroon',
                'insetChina',
                'insetColumbia',
                'insetCostaRica',
                'insetCuba',
                'insetCapeVerde',
                'insetChristmasIsland',
                'insetCyprus',
                'insetCzechRepublic',
                'insetGermany',
                'insetDjibouti',
                'insetDenmark',
                'insetDominica',
                'insetDominicanRepublic',
                'insetAlgeria',
                'insetEucadorMainland',
                'insetGalapagos',
                'insetEstonia',
                'insetEgypt',
                'insetEritrea',
                'insetSpainMainland',
                'insetCanaryIslands',
                'insetEthiopia',
                'insetFinland',
                'insetFijiMainIslands',
                'insetFalklandIslands',
                'insetMicronesia',
                'insetFaroeIslands',
                'insetMainlandFrance',
                'insetGuadeloupe',
                'insetMartinique',
                'insetCorsica',
                'insetFrenchGuiana',
                'insetMayotte',
                'insetRéunion',
                'insetGabon',
                'insetUnitedKingdom',
                'insetGrenadaMainland',
                'insetSouthernGrenadineIslands',
                'insetGeorgia',
                'insetGuernsey',
                'insetGhana',
                'insetGibraltar',
                'insetGreenland',
                'insetTheGambia',
                'insetGuinea',
                'insetEquatorialGuineaMainland',
                'insetBioko',
                'insetGreece',
                'insetGuatemala',
                'insetGuineaBissau',
                'insetGuyana',
                'insetHonduras',
                'insetCroatia',
                'insetHaiti',
                'insetHungary',
                'insetIndonesia',
                'insetIreland',
                'insetIsrael',
                'insetIsleofMan',
                'insetIndia',
                'insetIraq',
                'insetIran',
                'insetIceland',
                'insetItaly',
                'insetJersey',
                'insetJamaica',
                'insetJordan',
                'insetJapan',
                'insetKenya',
                'insetKyrgyzstan',
                'insetCambodia',
                'insetKiribati',
                'insetComoros',
                'insetSaintKittsandNevis',
                'insetNorthKorea',
                'insetSouthKorea',
                'insetKuwait',
                'insetCaymanIslands',
                'insetKazakhstan',
                'insetLaos',
                'insetLebanon',
                'insetSaintLucia',
                'insetLiechtenstein',
                'insetSriLanka',
                'insetLiberia',
                'insetLesotho',
                'insetLithuania',
                'insetLuxembourg',
                'insetLatvia',
                'insetLibya',
                'insetMorocco',
                'insetMonaco',
                'insetMoldova',
                'insetMontenegro',
                'insetMadagascar',
                'insetMarshallIslands',
                'insetNorthMacedonia',
                'insetMali',
                'insetMyanmar',
                'insetMongolia',
                'insetMauritania',
                'insetMontserrat',
                'insetMalta',
                'insetMauritiusMainland',
                'insetRodriguesIsland',
                'insetAgalegaIslands',
                'insetMaldives',
                'insetMalawi',
                'insetMexico',
                'insetPeninsularMalaysia',
                'insetEastMalaysia',
                'insetMozambique',
                'insetNamibia',
                'insetNiger',
                'insetNorfolkIsland',
                'insetNigeria',
                'insetNicaragua',
                'insetDutchCarribeanNorth',
                'insetDutchCarribeanSouth',
                'insetNorway',
                'insetNepal',
                'insetNauru',
                'insetNiue',
                'insetNewZealand',
                'insetOman',
                'insetPanama',
                'insetPeru',
                'insetPapuaNewGuinea',
                'insetPhilippines',
                'insetPakistan',
                'insetPoland',
                'insetPitcairnIslands',
                'insetStateofPalestine',
                'insetPortugalMainland',
                'insetAzores',
                'insetMadeira',
                'insetPalauMainland',
                'insetParaguay',
                'insetQatar',
                'insetRomania',
                'insetSerbia',
                'insetRussia',
                'insetRwanda',
                'insetSaudiArabia',
                'insetSolomonIslands',
                'insetSeychelles',
                'insetSudan',
                'insetSweden',
                'insetSingapore',
                'insetSaintHelenaAscensionandTristandaCunha',
                'insetSlovenia',
                'insetSlovakia',
                'insetSierraLeone',
                'insetSanMarino',
                'insetSenegal',
                'insetSomalia',
                'insetSuriname',
                'insetSouthSudan',
                'insetSãoTomé',
                'insetPríncipe',
                'insetElSalvador',
                'insetSyria',
                'insetEswatini',
                'insetTurksandCaicosIslands',
                'insetChad',
                'insetTogo',
                'insetThailand',
                'insetTajikistan',
                'insetTokelau',
                'insetEastTimor',
                'insetTurkmenistan',
                'insetTunisia',
                'insetTonga',
                'insetTurkey',
                'insetTrinidadandTobago',
                'insetTuvalu',
                'insetTanzania',
                'insetUkraine',
                'insetUganda',
                'insetContinentalUSA',
                'insetGuam',
                'insetPuertoRicoPlusUSVI',
                'insetHawaii',
                'insetAlaska',
                'insetUruguay',
                'insetUzbekistan',
                'insetVaticanCity',
                'insetSaintVincentandtheGrenadines',
                'insetVenezuela',
                'insetBritishVirginIslands',
                'insetVietnam',
                'insetVanuatu',
                'insetSamoa',
                'insetYemen',
                'insetSouthAfrica',
                'insetZambia',
                'insetZimbabwe',
                'insetAlabamaUSA',
                'insetAlaskaUSA',
                'insetArizonaUSA',
                'insetArkansasUSA',
                'insetCaliforniaUSA',
                'insetColoradoUSA',
                'insetConnecticutUSA',
                'insetDelawareUSA',
                'insetFloridaUSA',
                'insetGeorgiaUSA',
                'insetHawaiiUSA',
                'insetIdahoUSA',
                'insetIllinoisUSA',
                'insetIndianaUSA',
                'insetIowaUSA',
                'insetKansasUSA',
                'insetKentuckyUSA',
                'insetLouisianaUSA',
                'insetMaineUSA',
                'insetMarylandUSA',
                'insetMassachusettsUSA',
                'insetMichiganUSA',
                'insetMinnesotaUSA',
                'insetMississippiUSA',
                'insetMissouriUSA',
                'insetMontanaUSA',
                'insetNebraskaUSA',
                'insetNevadaUSA',
                'insetNewHampshireUSA',
                'insetNewJerseyUSA',
                'insetNewMexicoUSA',
                'insetNewYorkUSA',
                'insetNorthCarolinaUSA',
                'insetNorthDakotaUSA',
                'insetOhioUSA',
                'insetOklahomaUSA',
                'insetOregonUSA',
                'insetPennsylvaniaUSA',
                'insetRhodeIslandUSA',
                'insetSouthCarolinaUSA',
                'insetSouthDakotaUSA',
                'insetTennesseeUSA',
                'insetTexasUSA',
                'insetUtahUSA',
                'insetVermontUSA',
                'insetVirginiaUSA',
                'insetWashingtonUSA',
                'insetWestVirginiaUSA',
                'insetWisconsinUSA',
                'insetWyomingUSA',
                'insetAmericanSamoaUSA',
                'insetGuamUSA',
                'insetNorthernMarianaIslandsUSA',
                'insetPuertoRicoUSA',
                'insetUSVirginIslandsUSA',
                'insetDistrictofColumbiaUSA',
                'insetAlbertaCanada',
                'insetBritishColumbiaCanada',
                'insetManitobaCanada',
                'insetNewBrunswickCanada',
                'insetNewfoundlandandLabradorCanada',
                'insetNorthwestTerritoriesCanada',
                'insetNovaScotiaCanada',
                'insetNunavutCanada',
                'insetOntarioCanada',
                'insetPrinceEdwardIslandCanada',
                'insetQuebecCanada',
                'insetSaskatchewanCanada',
                'insetYukonCanada',
            ],
            '(; min: number = null, center: number = null, max: number = null) -> scale': [
                'linearScale',
                'logScale',
            ],
            '(; data: [number], scale: scale, ramp: ramp, label: string = null, unit: Unit = null, geo: [geoFeatureHandle] = geo, outline: outline = constructOutline(color=colorBlack, weight=0), basemap: basemap = osmBasemap(), insets: insets = defaultInsets, textBoxes: [textBox] = null) -> cMap': [
                'cMap',
            ],
            '(; dataR: [number], dataG: [number], dataB: [number], label: string, unit: Unit = null, geo: [geoFeatureHandle] = geo, outline: outline = constructOutline(color=colorBlack, weight=0), basemap: basemap = osmBasemap(), insets: insets = defaultInsets, textBoxes: [textBox] = null) -> cMapRGB': [
                'cMapRGB',
            ],
            '(; data: [number], scale: scale, ramp: ramp, label: string = null, unit: Unit = null, geo: [geoCentroidHandle] = geoCentroid, maxRadius: number = 10, relativeArea: [number] = null, basemap: basemap = osmBasemap(), insets: insets = defaultInsets, textBoxes: [textBox] = null) -> pMap': [
                'pMap',
            ],
            '(; color: color = rgb(0, 0, 0), weight: number = 0.5) -> outline': [
                'constructOutline',
            ],
            '(; noLabels: boolean = false, subnationalOutlines: outline = constructOutline(color=colorBlack, weight=1)) -> basemap': [
                'osmBasemap',
            ],
            '(; backgroundColor: color = rgb(1, 1, 1, a=1), textColor: color = null) -> basemap': [
                'noBasemap',
            ],
            'richTextAlign': [
                'alignLeft',
                'alignCenter',
                'alignRight',
                'alignJustify',
            ],
            'richTextList': [
                'listOrdered',
                'listBullet',
                'listNone',
            ],
        },
    )
})

void test('equivalent expressions produce equivalent results', (): void => {
    // Create a context with all constants available
    const context = new Context(
        () => {
            // Ignore warnings for this test
        },
        (msg: string, location: LocInfo) => {
            return new InterpretationError(msg, location)
        },
        defaultConstants,
        new Map(),
    )

    // Check all constants that have equivalentExpressions
    for (const [constantName, constantValue] of defaultConstants) {
        const equivalentExpressions = constantValue.documentation?.equivalentExpressions
        if (!equivalentExpressions || equivalentExpressions.length === 0) {
            continue
        }

        // Evaluate the original constant
        const originalValue = context.getVariable(constantName)
        if (!originalValue) {
            throw new Error(`Could not find constant: ${constantName}`)
        }

        // Evaluate each equivalent expression and compare with the original
        for (let i = 0; i < equivalentExpressions.length; i++) {
            const equivalentExpr = equivalentExpressions[i]
            const evaluatedEquivalent = evaluate(equivalentExpr, context)

            // Colors may be rgb or hsv, so just compare the hex expressions
            const isColor = (v: USSRawValue): v is USSRawValue & { value: Color } => typeof v === 'object' && v !== null && 'type' in v && v.opaqueType === 'color'
            if (isColor(originalValue.value) && isColor(evaluatedEquivalent.value)) {
                assert.deepStrictEqual(evaluatedEquivalent.type, originalValue.type)
                assert.equal(doRender(evaluatedEquivalent.value.value), doRender(originalValue.value.value), `Colors ${deconstructColor(evaluatedEquivalent.value.value)} != ${deconstructColor(originalValue.value.value)}`)
            }
            else {
                // Compare only value and type (evaluated expressions don't have documentation)
                assert.deepStrictEqual(
                    { type: evaluatedEquivalent.type, value: evaluatedEquivalent.value },
                    { type: originalValue.type, value: roundNumbers(originalValue.value) },
                    `Equivalent expression ${i} for constant "${constantName}" produced different result. Expected: ${JSON.stringify({ type: originalValue.type, value: originalValue.value })}, Got: ${JSON.stringify({ type: evaluatedEquivalent.type, value: evaluatedEquivalent.value })}`,
                )
            }
        }
    }
})

function roundNumbers(obj: unknown): unknown {
    if (Array.isArray(obj)) {
        return obj.map(roundNumbers)
    }
    if (obj instanceof Object) {
        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, roundNumbers(v)]))
    }
    if (typeof obj === 'number') {
        return round(obj, 3)
    }
    return obj
}

void test('all constants have proper documentation', (): void => {
    // Check that all constants have proper documentation
    for (const [constantName, constantValue] of defaultConstants) {
        // Verify that the constant has documentation
        assert(
            constantValue.documentation,
            `Constant "${constantName}" is missing documentation`,
        )

        const doc = constantValue.documentation

        // Verify that all constants have a humanReadableName
        assert(
            doc.humanReadableName,
            `Constant "${constantName}" is missing humanReadableName in documentation`,
        )

        // Verify that all constants have a category
        assert(
            doc.category,
            `Constant "${constantName}" is missing category in documentation`,
        )

        // Verify that all constants have a longDescription
        assert(
            doc.longDescription,
            `Constant "${constantName}" is missing longDescription in documentation`,
        )

        // Verify that the longDescription is not empty
        assert(
            doc.longDescription.length > 0,
            `Constant "${constantName}" has empty longDescription`,
        )

        // Verify that the humanReadableName is not empty
        assert(
            doc.humanReadableName.length > 0,
            `Constant "${constantName}" has empty humanReadableName`,
        )
    }

    // Log some statistics about the constants
    const categoryCounts = new Map<string, number>()
    for (const [, constantValue] of defaultConstants) {
        const category = constantValue.documentation?.category
        if (category) {
            categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
        }
    }

    // Log some statistics about the constants (commented out to avoid console statements in tests)
    // console.log('Constant documentation statistics:')
    // for (const [category, count] of categoryCounts) {
    //     console.log(`  ${category}: ${count} constants`)
    // }
    // console.log(`Total constants: ${defaultConstants.size}`)
})
