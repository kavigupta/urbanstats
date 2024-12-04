import React, { CSSProperties, ReactNode } from 'react'
import { MoonLoader } from 'react-spinners'

import { useColors } from '../page_template/colors'

export function InitialLoad(): ReactNode {
    const containerStyle: CSSProperties = {
        width: '100%',
        height: '50vh',
    }

    const colors = useColors()

    return (
        <div style={containerStyle}>
            <MoonLoader
                color={colors.textMain}
                cssOverride={{ marginLeft: 'auto', marginRight: 'auto', marginTop: '25vh' }}
            />
        </div>
    )
}
