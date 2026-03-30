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
    'mapLoading',
    'mobileUndoRedoControls',
    'modal',
    'sidebarOverlay',
    'pageLoading',
] as const

export const zIndex = Object.fromEntries(layers.map((name, i) => [name, i + 1]))
