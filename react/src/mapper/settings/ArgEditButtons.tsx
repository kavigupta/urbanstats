import React, { ReactNode, useContext } from 'react'

import { assert } from '../../utils/defensive'

import { PencilButton } from './BetterSelector'
import { mapSettingsContext } from './MapSettingsContext'
import { getInsets } from './edit-insets'
import { getTextBoxes } from './edit-text-boxes'

export function Insets(): ReactNode {
    const context = useContext(mapSettingsContext)
    assert(context !== undefined, 'Map Settings Context Required')
    return getInsets(context.mapSettings, context.typeEnvironment) && <PencilButton onEdit={() => { context.setMapEditorMode('insets') }} data-test="edit-insets" />
}

export function TextBoxes(): ReactNode {
    const context = useContext(mapSettingsContext)
    assert(context !== undefined, 'Map Settings Context Required')
    return getTextBoxes(context.mapSettings, context.typeEnvironment) && <PencilButton onEdit={() => { context.setMapEditorMode('textBoxes') }} data-test="edit-text-boxes" />
}
