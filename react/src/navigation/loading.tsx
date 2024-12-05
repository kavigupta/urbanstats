import React, { CSSProperties, ReactNode, useContext } from 'react'
import { BarLoader, MoonLoader } from 'react-spinners'

import { useColors } from '../page_template/colors'

import { Navigator } from './navigator'

export function InitialLoad(): ReactNode {
    const containerStyle: CSSProperties = {
        width: '100%',
        height: '50vh',
    }

    const colors = useColors()

    return (
        <div style={containerStyle} data-test-id="initialLoad">
            <MoonLoader
                color={colors.textMain}
                cssOverride={{ marginLeft: 'auto', marginRight: 'auto', marginTop: '25vh' }}
            />
        </div>
    )
}

export function SubsequentLoad(): ReactNode {
    const loading = useContext(Navigator.Context).useSubsequentLoading()
    switch (loading) {
        case 'notLoading':
            return null
        case 'quickLoad':
            return <QuickLoad />
        case 'longLoad':
            return <LongLoad />
    }
}

const zIndex = 10000 // Must be greater than leaflet

function QuickLoad(): ReactNode {
    const colors = useColors()
    const style: CSSProperties = {
        position: 'fixed',
        top: '0px',
        left: '0px',
        right: '0px',
        width: undefined,
        zIndex,
    }

    return <BarLoader color={colors.textMain} cssOverride={style} data-test-id="quickLoad" />
}

function LongLoad(): ReactNode {
    const colors = useColors()
    const containerStyle: CSSProperties = {
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex,
        backgroundColor: `${colors.background}80`,
    }
    const width = '78px'
    const loaderStyle: CSSProperties = {
        position: 'absolute',
        width,
        height: width,
        top: `calc(50% - ${width} / 2)`,
        left: `calc(50% - ${width} / 2)`,
    }
    return (
        <div style={containerStyle} data-test-id="longLoad">
            <MoonLoader color={colors.textMain} cssOverride={loaderStyle} />
        </div>
    )
}
