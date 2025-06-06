import hueColors from '../data/hueColors'
import { rgbToCss } from '../utils/color'

export interface HueColors {
    blue: string
    orange: string
    darkOrange: string
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
    bannerURL: string
    mixPct: number
    hueColors: HueColors
    screenshotFooterUrl: string
    canvasKey: { r: number, g: number, b: number }
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

// Key colors are slightly off from this so the map borders look nice when keying
const lightBorderNonShadow = { r: 204, g: 204, b: 204 }
const darkBorderNonShadow = { r: 51, g: 51, b: 51 }

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
        borderShadow: rgbToCss(lightBorderNonShadow),
        borderNonShadow: '#cccccc',
        ordinalTextColor: '#444444',
        unselectedButton: '#e6e9ef',
        selectedButton: '#4e525a',
        selectedButtonText: '#ffffff',
        blueLink: '#22f',
        bannerURL: '/banner.png',
        mixPct: 70,
        hueColors: defaultHueColors,
        screenshotFooterUrl: 'screenshot_footer.svg',
        canvasKey: { r: lightBorderNonShadow.r, g: lightBorderNonShadow.g + 1, b: lightBorderNonShadow.b },
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
        borderNonShadow: rgbToCss(darkBorderNonShadow),
        ordinalTextColor: '#bbbbbb',
        unselectedButton: '#303030',
        selectedButton: '#a2a6ae',
        selectedButtonText: '#000000',
        blueLink: '#aaaaff',
        bannerURL: '/banner-dark.png',
        mixPct: 50,
        hueColors: defaultHueColors,
        screenshotFooterUrl: 'screenshot_footer_dark.svg',
        canvasKey: { r: darkBorderNonShadow.r, g: darkBorderNonShadow.g + 1, b: darkBorderNonShadow.b },
    },
}
