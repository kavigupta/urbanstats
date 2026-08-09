import React, { CSSProperties, ReactNode, useContext } from 'react'

import { useColors } from '../page_template/colors'
import { Settings, useIsStaged } from '../page_template/settings'
import { useMobileLayout } from '../utils/responsive'

export function StagingControls(): ReactNode {
    const settings = useContext(Settings.Context)
    const colors = useColors()
    const isMobile = useMobileLayout()
    const staged = useIsStaged()

    if (!staged) {
        return null
    }

    const spacing = isMobile ? '20px' : '10px'

    const buttonStyle: CSSProperties = {
        border: `2px solid ${colors.textMain}`,
    }

    return (
        <div
            style={{
                backgroundColor: colors.slightlyDifferentBackgroundFocused,
                borderRadius: '5px',
                padding: spacing,
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing,
            }}
            data-test-id="staging_controls"
        >
            <div>
                These settings are different than the ones you have saved...
            </div>
            <div style={{
                display: 'flex',
                gap: spacing,
                flex: '0 0 auto',
            }}
            >
                <button data-test-id="discard" style={buttonStyle} onClick={() => { settings.exitStagedMode('discard') }}>Discard</button>
                <button data-test-id="apply" style={buttonStyle} onClick={() => { settings.exitStagedMode('apply') }}>Apply</button>
            </div>
        </div>
    )
}
