import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from 'react'

import { mixWithBackground } from '../utils/color'

import { Colors, colorThemes, HueColors, JuxtastatColors, Theme } from './color-themes'
import { useSetting } from './settings'

type ThemeSelection = 'userSettings' | 'Light Mode' | 'Dark Mode' | 'System Theme'

// eslint-disable-next-line no-restricted-syntax -- React context
const ThemeContext = React.createContext<ThemeSelection>('userSettings')

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

export function useStyleElement(): (elem: HTMLElement) => void {
    const colors = useColors()
    const juxtaColors = useJuxtastatColors()

    return useCallback((elem: HTMLElement) => {
        elem.style.setProperty('--quiz-plain-bg', colors.unselectedButton)
        elem.style.setProperty('--quiz-selected-bg', colors.selectedButton)
        elem.style.setProperty('--quiz-correct', juxtaColors.correct)
        elem.style.setProperty('--quiz-incorrect', juxtaColors.incorrect)
        elem.style.setProperty('--slightly-different-background', colors.slightlyDifferentBackground)
        elem.style.setProperty('--slightly-different-background-focused', colors.slightlyDifferentBackgroundFocused)
        elem.style.setProperty('--blue-link', colors.blueLink)
        elem.style.setProperty('--text-main-opposite', colors.textMainOpposite)
        elem.style.setProperty('--text-main', colors.textMain)
        elem.style.setProperty('--ordinal-text-color', colors.ordinalTextColor)
        elem.style.setProperty('--background', colors.background)
        elem.style.setProperty('--highlight', colors.highlight)
        elem.style.setProperty('--border-non-shadow', colors.borderNonShadow)
    }, [colors, juxtaColors])
}

export function OverrideTheme({ theme, children }: { theme: ThemeSelection, children: ReactNode }): ReactNode {
    return (
        <ThemeContext.Provider value={theme}>
            <ThemeOverride>
                {children}
            </ThemeOverride>
        </ThemeContext.Provider>
    )
}

function ThemeOverride({ children }: { children: ReactNode }): ReactNode {
    const divRef = useRef<HTMLDivElement>(null)

    const styleElement = useStyleElement()

    useEffect(() => {
        styleElement(divRef.current!)
    }, [styleElement])

    return <div ref={divRef}>{children}</div>
}
