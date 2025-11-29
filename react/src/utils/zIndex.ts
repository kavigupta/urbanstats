const layers = [
    'categoryCheckbox',
    'universeDropdown',
    'screenshotDim',
    'screenshotSpin',
    'searchResults',
    'mobileSearch',
    'comparisonMapButton',
    'plotSettings',
    'betterSelectorMenu',
    'statisticNameDisclaimer',
    'mobileUndoRedoControls',
    'sidebarOverlay',
] as const

export const zIndex = Object.fromEntries(layers.map((name, i) => [name, i + 1]))
