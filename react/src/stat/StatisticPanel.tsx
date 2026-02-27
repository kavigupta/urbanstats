import { ReactNode, useState } from 'react'

import { StatSettings } from './types'
import { useStatGenerator } from './useStatGenerator'

export function StatisticPanel({ settings }: { settings: StatSettings }): ReactNode {
    const [settingsState, setSettingsState] = useState(settings)

    const generator = useStatGenerator({ stat: settings.stat })
}

// In view mode, set function appends to history

// In edit mode, set function
