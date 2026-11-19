import { createContext } from 'react'

import { Range } from '../../urban-stats-script/editor-utils'
import { Property } from '../../utils/Property'

export interface Selection {
    blockIdent: string
    range: Range
}

// eslint-disable-next-line no-restricted-syntax -- React contexts typically are capitalized
export const SelectionContext = createContext(new Property<Selection | undefined>(undefined))
