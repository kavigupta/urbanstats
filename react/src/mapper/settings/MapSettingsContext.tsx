import { createContext } from 'react'

import { TypeEnvironment } from '../../urban-stats-script/types-values'

import { MapEditorMode, MapSettings } from './utils'

interface MapSettingsContext {
    mapSettings: MapSettings
    typeEnvironment: TypeEnvironment
    setMapEditorMode: (m: MapEditorMode) => void
}

export const mapSettingsContext = createContext<MapSettingsContext | undefined>(undefined)
