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
}

export interface JuxtastatColors {
    correct: string
    incorrect: string
    correctEmoji: string
    incorrectEmoji: string
}

const defaultHueColors: HueColors = {
    blue: '#5a7dc3',
    orange: '#f7aa41',
    darkOrange: '#af6707',
    purple: '#975ac3',
    red: '#f96d6d',
    grey: '#8e8e8e',
    darkGrey: '#4e525a',
    pink: '#c767b0',
    yellow: '#b8a32f',
    green: '#8ac35a',
    cyan: '#07a5af',
}

export type Theme = 'Light Mode' | 'Dark Mode'

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
        bannerURL: '/banner.png',
        mixPct: 70,
        hueColors: defaultHueColors,
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
        bannerURL: '/banner-dark.png',
        mixPct: 50,
        hueColors: defaultHueColors,
    },
}
