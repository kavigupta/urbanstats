import React, { ReactNode, useContext } from 'react'

import { Settings } from '../page_template/settings'

export function StagingControls(): ReactNode {
    const settings = useContext(Settings.Context)

    return (
        <>
            These settings are different than the ones you have saved...
            <button onClick={() => { settings.exitStagedMode('discard') }}>Discard</button>
            <button onClick={() => { settings.exitStagedMode('apply') }}>Apply</button>
        </>
    )
}
