import React, { CSSProperties, ReactNode, useContext } from 'react'
import { BarLoader, MoonLoader } from 'react-spinners'

import { useColors } from '../page_template/colors'
import { zIndex } from '../utils/zIndex'

import { Navigator } from './Navigator'

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
            return <LongLoad testId="longLoad" />
    }
}

function QuickLoad(): ReactNode {
    const colors = useColors()
    const style: CSSProperties = {
        position: 'fixed',
        top: '0px',
        left: '0px',
        right: '0px',
        width: undefined,
        zIndex: zIndex.pageLoading,
    }

    return <BarLoader color={colors.textMain} cssOverride={style} data-test-id="quickLoad" />
}

export function LongLoad({ containerStyleOverride, testId }: { containerStyleOverride?: CSSProperties, testId?: string }): ReactNode {
    const colors = useColors()
    const containerStyle: CSSProperties = {
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: zIndex.pageLoading,
        backgroundColor: `${colors.background}80`,
        ...containerStyleOverride,
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
        <div style={containerStyle} data-test-id={testId}>
            <MoonLoader color={colors.textMain} cssOverride={loaderStyle} />
        </div>
    )
}

export function RelativeLoader({ loading }: { loading: boolean }): ReactNode {
    return (
        <LongLoad containerStyleOverride={{
            position: 'absolute',
            transition: 'opacity 0.25s',
            opacity: loading ? 1 : 0,
            pointerEvents: 'none',
        }}
        />
    )
}
