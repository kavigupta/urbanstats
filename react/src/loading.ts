import { colorThemes } from './page_template/color-themes'

const savedSettings = localStorage.getItem('settings')
// eslint-disable-next-line no-restricted-syntax -- Represents persisted data
const loadedSettings = JSON.parse(savedSettings ?? '{}') as { theme?: string, clean_background?: boolean }

let theme: 'Dark Mode' | 'Light Mode'

switch (loadedSettings.theme) {
    case 'Dark Mode':
    case 'Light Mode':
        theme = loadedSettings.theme
        break
    default:
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark Mode' : 'Light Mode'
}

const themeDict = { ...colorThemes[theme] }
if (loadedSettings.clean_background) {
    themeDict.background = themeDict.cleanBackground
    themeDict.slightlyDifferentBackground = themeDict.cleanSlightlyDifferentBackground
}

document.documentElement.style.setProperty('--loading-main', themeDict.textMain)
document.documentElement.style.setProperty('--loading-background', themeDict.background)
