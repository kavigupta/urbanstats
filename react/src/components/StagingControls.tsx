import React, { CSSProperties, ReactNode, useContext } from 'react'

import { useColors } from '../page_template/colors'
import { Settings, useIsStaged } from '../page_template/settings'
import { useMobileLayout } from '../utils/responsive'

/**
 * The Discard/Apply banner for staged settings, or nothing when nothing is staged. The page
 * renders it above its table rather than the table rendering it, so that it stays outside the
 * table's horizontal scroll, where the buttons would sit off screen at the right edge of the
 * scrolled-away content.
 */
export function StagingControls({ onExitStaging }: {
    /** Run after either button leaves staging mode. */
    onExitStaging: () => void
}): ReactNode {
    const settings = useContext(Settings.Context)
    const colors = useColors()
    const isMobile = useMobileLayout()
    const staged = useIsStaged()

    if (!staged) {
        return null
    }

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
