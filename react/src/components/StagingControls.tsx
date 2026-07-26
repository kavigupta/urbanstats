import React, { CSSProperties, ReactNode, useContext } from 'react'

import { useColors } from '../page_template/colors'
import { Settings } from '../page_template/settings'
import { useMobileLayout } from '../utils/responsive'

export function StagingControls({ onExitStaging }: {
    /** Run after either button leaves staging mode. */
    onExitStaging: () => void
}): ReactNode {
    const settings = useContext(Settings.Context)
    const colors = useColors()
    const isMobile = useMobileLayout()

    const buttonStyle: CSSProperties = {
        border: `2px solid ${colors.textMain}`,
        margin: isMobile ? '20px' : '10px',
    }

    const exitStaging = (action: 'discard' | 'apply') => () => {
        settings.exitStagedMode(action)
        onExitStaging()
    }

    return (
        <div
            style={{
                backgroundColor: colors.slightlyDifferentBackgroundFocused,
                borderRadius: '5px',
                padding: '10px',
                marginBottom: '10px',
                paddingBottom: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
            }}
            data-test-id="staging_controls"
        >
            <div>
                These settings are different than the ones you have saved...
            </div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-evenly',
                flex: '0 0 auto',
            }}
            >
                <button data-test-id="discard" style={buttonStyle} onClick={exitStaging('discard')}>Discard</button>
                <button data-test-id="apply" style={buttonStyle} onClick={exitStaging('apply')}>Apply</button>
            </div>
        </div>
    )
}
