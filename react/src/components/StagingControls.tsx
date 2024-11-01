import React, { CSSProperties, ReactNode, useContext } from 'react'

import { useColors } from '../page_template/colors'
import { Settings } from '../page_template/settings'
import { useMobileLayout } from '../utils/responsive'

export function StagingControls(): ReactNode {
    const settings = useContext(Settings.Context)
    const colors = useColors()
    const isMobile = useMobileLayout()

    const buttonStyle: CSSProperties = {
        backgroundColor: colors.background,
        color: colors.textMain,
        borderRadius: '5px',
        margin: isMobile ? '20px' : '10px',
    }

    return (
        <div
            style={{
                backgroundColor: colors.slightlyDifferentBackgroundFocused,
                borderRadius: '5px',
                padding: '10px',
                textAlign: 'center',
                marginBottom: '10px',
                paddingBottom: '5px',
            }}
            data-test-id="staging_controls"
        >
            <div>
                These settings are different than the ones you have saved...
            </div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-evenly',
            }}
            >
                <button data-test-id="discard" style={buttonStyle} onClick={() => { settings.exitStagedMode('discard') }}>Discard</button>
                <button data-test-id="apply" style={buttonStyle} onClick={() => { settings.exitStagedMode('apply') }}>Apply</button>
            </div>
        </div>
    )
}
