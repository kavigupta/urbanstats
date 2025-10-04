import { useMemo } from 'react'

import { mixWithBackground } from '../utils/color'

import { Colors, colorThemes, HueColors, JuxtastatColors, Theme } from './color-themes'
import { useSetting } from './settings'

export function useCurrentTheme(): Theme {
    const [theme] = useSetting('theme')
    if (theme === 'System Theme') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark Mode' : 'Light Mode'
    }
    return theme
}

export function useColors(): Colors {
    const theme = useCurrentTheme()
    const [cleanBackground] = useSetting('clean_background')

    return useMemo(() => {
        const themeDict = { ...colorThemes[theme] }
        if (cleanBackground) {
            themeDict.background = themeDict.cleanBackground
            themeDict.slightlyDifferentBackground = themeDict.cleanSlightlyDifferentBackground
        }
        return themeDict
    }, [theme, cleanBackground])
}

export function useJuxtastatColors(): JuxtastatColors {
    const colors = useColors()
    const [colorblindMode] = useSetting('colorblind_mode')
    return {
        // eslint-disable-next-line no-restricted-syntax -- Allowing hex colors for themes
        correct: colorblindMode ? '#65fe08' : colors.hueColors.green,
        // eslint-disable-next-line no-restricted-syntax -- Allowing hex colors for themes
        incorrect: colorblindMode ? mixWithBackground(colors.hueColors.red, 0.3, '#000000') : colors.hueColors.red,
        correctEmoji: '🟩',
        incorrectEmoji: '🟥',
        lifeEmoji: colorblindMode ? '/life-colorblind.png' : '/life.png',
        lifeLostEmoji: '/life-lost.png',
    }
}

export function colorFromCycle(colors: HueColors, i: number): string {
    const colorCycle = [
        colors.blue,
        colors.orange,
        colors.purple,
        colors.red,
        colors.grey,
        colors.pink,
        colors.yellow,
        colors.green,
    ]
    return colorCycle[i % colorCycle.length]
}
