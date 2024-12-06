import React, { CSSProperties, ReactNode, Suspense, useMemo } from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import './common.css'
import { MoonLoader } from 'react-spinners'

import { colorThemes } from './page_template/color-themes'

function loadPage(): void {
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(
        <PageLoader />,
    )
}

loadPage()

const LazyRouter = React.lazy(() => import('./navigation/routers'))

function PageLoader(): ReactNode {
    return (
        <Suspense fallback={<Spinner />}>
            <LazyRouter />
        </Suspense>
    )
}

function Spinner(): ReactNode {
    const colors = useMemo(() => {
        const savedSettings = localStorage.getItem('settings')
        const loadedSettings = JSON.parse(savedSettings ?? '{}') as { theme?: string, clean_background?: boolean }

        let theme: 'Dark Mode' | 'Light Mode'

        switch (loadedSettings.theme) {
            case 'Dark Mode':
            case 'Light Mode':
                theme = loadedSettings.theme
                break
            default:
                theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark Mode' : 'Light Mode'
        }

        const themeDict = { ...colorThemes[theme] }
        if (loadedSettings.clean_background) {
            themeDict.background = themeDict.cleanBackground
            themeDict.slightlyDifferentBackground = themeDict.cleanSlightlyDifferentBackground
        }
        return themeDict
    }, [])

    const containerStyle: CSSProperties = {
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: colors.background,
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
