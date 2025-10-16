import hueColors from '../data/hueColors'

export interface HueColors {
    blue: string
    orange: string
    brown: string
    purple: string
    red: string
    grey: string
    darkGrey: string
    pink: string
    yellow: string
    green: string
    cyan: string
}

export interface Colors {
    background: string
    cleanBackground: string
    slightlyDifferentBackground: string
    cleanSlightlyDifferentBackground: string
    slightlyDifferentBackgroundFocused: string
    highlight: string
    textMain: string
    textMainOpposite: string
    textPointer: string
    borderShadow: string
    borderNonShadow: string
    ordinalTextColor: string
    unselectedButton: string
    selectedButton: string
    selectedButtonText: string
    blueLink: string
    mapInsetBorderColor: string
    buttonTextWhite: string
    bannerURL: string
    mixPct: number
    hueColors: HueColors
    screenshotFooterUrl: string
    pencilIcon: string
    wikidataURL: string
    mapperBannerURL: string
}

export interface JuxtastatColors {
    correct: string
    incorrect: string
    correctEmoji: string
    incorrectEmoji: string
    lifeEmoji: string
    lifeLostEmoji: string
}

const defaultHueColors: HueColors = hueColors

export type Theme = 'Light Mode' | 'Dark Mode'

/* eslint-disable no-restricted-syntax -- Allowing hex colors for themes */
export const colorThemes: Record<Theme, Colors> = {
    'Light Mode': {
        background: '#fff8f0',
        cleanBackground: '#ffffff',
        slightlyDifferentBackground: '#f7f1e8',
        cleanSlightlyDifferentBackground: '#faf7f2',
        slightlyDifferentBackgroundFocused: '#ffe0e0',
        highlight: '#d4b5e2',
        textMain: '#000000',
        textMainOpposite: '#ffffff',
        textPointer: '#222222',
        borderShadow: '#333333',
        borderNonShadow: '#cccccc',
        ordinalTextColor: '#444444',
        unselectedButton: '#e6e9ef',
        selectedButton: '#4e525a',
        selectedButtonText: '#ffffff',
        blueLink: '#22f',
        mapInsetBorderColor: '#000000',
        buttonTextWhite: '#ffffff',
        bannerURL: '/banner.png',
        mixPct: 70,
        hueColors: defaultHueColors,
        screenshotFooterUrl: 'screenshot_footer.svg',
        pencilIcon: '/pencil-light.png',
        wikidataURL: '/wikidata-light.svg',
        mapperBannerURL: '/mapper-banner.png',
    },
    'Dark Mode': {
        background: '#00060f',
        cleanBackground: '#000000',
        slightlyDifferentBackground: '#080e17',
        cleanSlightlyDifferentBackground: '#080e17',
        slightlyDifferentBackgroundFocused: '#3d2900',
        highlight: '#3b1d49',
        textMain: '#dddddd',
        textMainOpposite: '#000000',
        textPointer: '#dddddd',
        borderShadow: '#cccccc',
        borderNonShadow: '#333333',
        ordinalTextColor: '#bbbbbb',
        unselectedButton: '#303030',
        selectedButton: '#a2a6ae',
        selectedButtonText: '#000000',
        blueLink: '#aaaaff',
        mapInsetBorderColor: '#000000',
        buttonTextWhite: '#ffffff',
        bannerURL: '/banner-dark.png',
        mixPct: 50,
        hueColors: defaultHueColors,
        screenshotFooterUrl: 'screenshot_footer_dark.svg',
        pencilIcon: '/pencil-dark.png',
        wikidataURL: '/wikidata-dark.svg',
        mapperBannerURL: '/mapper-banner-dark.png',

    },
}
/* eslint-enable no-restricted-syntax -- Allowing hex colors for themes */
