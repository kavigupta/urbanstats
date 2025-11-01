import React, { useCallback, useContext, useMemo } from 'react'

import { mixWithBackground } from '../utils/color'

import { Colors, colorThemes, HueColors, JuxtastatColors, Theme } from './color-themes'
import { useSetting } from './settings'

// eslint-disable-next-line no-restricted-syntax -- React context
export const ThemeContext = React.createContext<'userSettings' | 'Light Mode' | 'Dark Mode' | 'System Theme'>('userSettings')

export function useCurrentTheme(): Theme {
    const [settingTheme] = useSetting('theme')
    const themeContext = useContext(ThemeContext)
    const theme = themeContext === 'userSettings' ? settingTheme : themeContext
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

export function useStyleDocument(): (doc: Document) => void {
    const colors = useColors()
    const juxtaColors = useJuxtastatColors()

    return useCallback((doc: Document) => {
        doc.body.style.backgroundColor = colors.background
        doc.body.style.color = colors.textMain
        doc.documentElement.style.setProperty('--quiz-plain-bg', colors.unselectedButton)
        doc.documentElement.style.setProperty('--quiz-selected-bg', colors.selectedButton)
        doc.documentElement.style.setProperty('--quiz-correct', juxtaColors.correct)
        doc.documentElement.style.setProperty('--quiz-incorrect', juxtaColors.incorrect)
        doc.documentElement.style.setProperty('--slightly-different-background', colors.slightlyDifferentBackground)
        doc.documentElement.style.setProperty('--slightly-different-background-focused', colors.slightlyDifferentBackgroundFocused)
        doc.documentElement.style.setProperty('--blue-link', colors.blueLink)
        doc.documentElement.style.setProperty('--text-main-opposite', colors.textMainOpposite)
        doc.documentElement.style.setProperty('--text-main', colors.textMain)
        doc.documentElement.style.setProperty('--ordinal-text-color', colors.ordinalTextColor)
        doc.documentElement.style.setProperty('--background', colors.background)
        doc.documentElement.style.setProperty('--highlight', colors.highlight)
        doc.documentElement.style.setProperty('--border-non-shadow', colors.borderNonShadow)
    }, [colors, juxtaColors])
}
