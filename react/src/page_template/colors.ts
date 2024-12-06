import { mixWithBackground } from '../utils/color'

import { Colors, colorThemes, JuxtastatColors, Theme } from './color-themes'
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
    const [clean_background] = useSetting('clean_background')
    const themeDict = { ...colorThemes[theme] }
    if (clean_background) {
        themeDict.background = themeDict.cleanBackground
        themeDict.slightlyDifferentBackground = themeDict.cleanSlightlyDifferentBackground
    }
    return themeDict
}

export function useJuxtastatColors(): JuxtastatColors {
    const colors = useColors()
    const [colorblind_mode] = useSetting('colorblind_mode')
    return {
        correct: colorblind_mode ? '#65fe08' : colors.hueColors.green,
        incorrect: colorblind_mode ? mixWithBackground(colors.hueColors.red, 0.3, '#000000') : colors.hueColors.red,
        correctEmoji: '🟩',
        incorrectEmoji: '🟥',
    }
}
