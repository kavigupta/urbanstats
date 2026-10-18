const layers = [
    // Only stacks against split dividers, since the map container is isolated
    'insetEditHandle',
    'universeDropdown',
    'screenshotDim',
    'screenshotSpin',
    'plotSettings',
    'searchResults',
    'mobileSearch',
    'comparisonMapButton',
    'betterSelectorMenu',
    'statisticNameDisclaimer',
    'mapLoading',
    'mobileUndoRedoControls',
    'sidebarOverlay',
    'pageLoading',
] as const

export const zIndex = Object.fromEntries(layers.map((name, i) => [name, i + 1]))
