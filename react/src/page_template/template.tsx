import React, { ReactNode, useEffect, useRef, useState } from 'react'

import { exportToCSV, CSVExportData } from '../components/csv-export'
import { Header } from '../components/header'
import { ScreenshotContext } from '../components/screenshot'
import { Sidebar } from '../components/sidebar'
import '../common.css'
import '../components/article.css'
import { TestUtils } from '../utils/TestUtils'
import { useMobileLayout } from '../utils/responsive'
import { zIndex } from '../utils/zIndex'

import { Colors } from './color-themes'
import { useColors, useStyleElement } from './colors'
import { useHideSidebarDesktop } from './utils'

export function PageTemplate({
    screencap = undefined,
    csvExportCallback = undefined,
    children,
    showFooter = true,
}: {
    screencap?: (currentUniverse: string | undefined, colors: Colors) => Promise<void>
    csvExportCallback?: CSVExportData
    children?: React.ReactNode
    showFooter?: boolean
}): ReactNode {
    const [hamburgerOpen, setHamburgerOpen] = useState(false)
    const [screenshotMode, setScreenshotMode] = useState(false)
    const colors = useColors()
    const mobileLayout = useMobileLayout()
    const hideSidebarDesktop = useHideSidebarDesktop()

    const styleElement = useStyleElement()
    useEffect(() => {
        styleElement(document.documentElement)
        document.body.style.backgroundColor = colors.background
        document.body.style.color = colors.textMain
    }, [styleElement, colors.background, colors.textMain])

    useEffect(() => {
        if (!(mobileLayout || hideSidebarDesktop) && hamburgerOpen) {
            setHamburgerOpen(false)
        }
    }, [hamburgerOpen, mobileLayout, hideSidebarDesktop])

    const hasScreenshotButton = screencap !== undefined
    const hasCSVButton = csvExportCallback !== undefined

    const exportCSV = (): void => {
        const csvExportData = csvExportCallback?.()
        if (csvExportData === undefined) {
            return
        }
        try {
            exportToCSV(csvExportData.csvData, csvExportData.csvFilename)
        }
        catch (e) {
            console.error(e)
        }
    }

    const doScreencap = async (currentUniverse: string | undefined): Promise<void> => {
        if (screencap === undefined) {
            return
        }
        try {
            await screencap(currentUniverse, colors)
        }
        catch (e) {
            console.error(e)
        }
    }

    const initiateScreenshot = (currentUniverse: string | undefined): void => {
        setScreenshotMode(true)
        setTimeout(async () => {
            await doScreencap(currentUniverse)
            setScreenshotMode(false)
        })
    }

    // https://stackoverflow.com/a/55451665
    const runningInTestCafe = (window as unknown as { '%hammerhead%': unknown })['%hammerhead%'] !== undefined

    return (
        <ScreenshotContext.Provider value={screenshotMode}>
            <meta name="viewport" content="width=device-width, initial-scale=0.75" />
            <div
                className={mobileLayout ? 'main_panel_mobile' : 'main_panel'}
                style={{
                    ...(mobileLayout
                        ? { paddingLeft: '1em', paddingRight: '1em' }
                        : {
                                position: 'relative',
                                maxWidth: hideSidebarDesktop ? undefined : '80em',
                                marginLeft: 'auto',
                                marginRight: 'auto',
                            }),
                    backgroundColor: colors.background,
                    // simulate mobile zoom in testcafe so screenshots are more accurate to what they would actually be on mobile
                    // since desktop browsers don't respect meta[name=viewport]
                    zoom: mobileLayout && runningInTestCafe ? 0.75 : undefined,
                }}
            >
                <Header
                    hamburgerOpen={hamburgerOpen}
                    setHamburgerOpen={setHamburgerOpen}
                    hasScreenshot={hasScreenshotButton}
                    hasCSV={hasCSVButton}
                    initiateScreenshot={(currentUniverse) => { initiateScreenshot(currentUniverse) }}
                    exportCSV={exportCSV}
                />
                <div style={{ marginBlockEnd: '16px' }}></div>
                <BodyPanel
                    hamburgerOpen={hamburgerOpen}
                    mainContent={children}
                    showFooter={showFooter}
                    setHamburgerOpen={setHamburgerOpen}
                />
            </div>
        </ScreenshotContext.Provider>
    )
}

function TemplateFooter(): ReactNode {
    return (
        <div className="centered_text">
            {'Urban Stats Version '}
            <Version />
            {' by '}
            <MainCredits />
            {'. Last updated '}
            <LastUpdated />
            {'. '}
            <OtherCredits />
            {' Not for commercial use. '}
            <Support />
            {' '}
            <Store />
        </div>
    )
}

function Version(): ReactNode {
    return (
        <span id="current-version">
            {TestUtils.shared.isTesting ? '<VERSION>' : '31.2.1'}
        </span>
    )
}

function LastUpdated(): ReactNode {
    return (
        <span id="last-updated">
            {TestUtils.shared.isTesting ? '<LAST UPDATED>' : '2026-02-23'}
        </span>
    )
}

function MainCredits(): ReactNode {
    return <span id="main-credits">Kavi Gupta and Luke Brody</span>
}

function OtherCredits(): ReactNode {
    return (
        <span>
            {'Significant help with weather data from '}
            <a href="https://twitter.com/OklahomaPerson">OklahomaPerson</a>
            .
            {' Thanks to '}
            <a href="https://bsky.app/profile/elpis.bsky.social">Taylor</a>
            {' for the Metropolitan Clusters.'}
        </span>
    )
}

function BodyPanel({ hamburgerOpen, mainContent, showFooter, setHamburgerOpen }: {
    hamburgerOpen: boolean
    mainContent: React.ReactNode
    showFooter: boolean
    setHamburgerOpen: (open: boolean) => void
}): ReactNode {
    const mobileLayout = useMobileLayout()
    const hideSidebarDesktop = useHideSidebarDesktop()

    if (hamburgerOpen && (!hideSidebarDesktop || mobileLayout)) {
        return <LeftPanel setHamburgerOpen={setHamburgerOpen} />
    }
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
        }}
        >
            {(!mobileLayout && (!hideSidebarDesktop || hamburgerOpen)) ? <LeftPanel setHamburgerOpen={setHamburgerOpen} /> : undefined }
            <div
                className={mobileLayout ? 'content_panel_mobile' : 'right_panel'}
                style={mobileLayout
                    ? { width: '100%' }
                    : (hideSidebarDesktop
                            ? { width: '100%', paddingLeft: '1em', paddingRight: '1em' }
                            : { width: '80%', paddingLeft: '2em' })}
            >
                {mainContent}

                { showFooter
                    ? (
                            <>
                                <div className="gap" />
                                <TemplateFooter />
                            </>
                        )
                    : null }
            </div>
        </div>
    )
}

function LeftPanel({ setHamburgerOpen }: { setHamburgerOpen: (open: boolean) => void }): ReactNode {
    const mobileLayout = useMobileLayout()
    const colors = useColors()
    const hideSidebarDesktop = useHideSidebarDesktop()
    const sidebar = (
        <div
            className="left_panel"
            style={mobileLayout
                ? {}
                : {
                        width: '20%',
                        float: 'left',
                        borderRadius: hideSidebarDesktop ? '5px' : undefined,
                        border: hideSidebarDesktop ? `1px solid ${colors.borderShadow}` : undefined,
                        overflow: 'hidden', // needed so the corners aren't cut off
                    }}
        >
            <Sidebar onNavigate={() => { setHamburgerOpen(false) }} />
        </div>
    )

    const hideRef = useRef<HTMLDivElement>(null)
    if (!mobileLayout && hideSidebarDesktop) {
        return (
            <div
                ref={hideRef}
                style={{
                    position: 'absolute',
                    zIndex: zIndex.sidebarOverlay,
                    left: 0,
                    right: 0,
                    height: '100%',
                    backgroundColor: `${colors.background}99`,
                }}
                onClick={(e) => {
                    if (e.target === hideRef.current) {
                        setHamburgerOpen(false)
                    }
                }}
            >
                {sidebar}
            </div>
        )
    }
    return sidebar
}

function Support(): ReactNode {
    return (
        <span>
            {'If you find Urban Stats useful, please donate on '}
            <a href="https://ko-fi.com/notkavi">kofi</a>
            !
        </span>
    )
}

function Store(): ReactNode {
    return (
        <span>
            {'Check out the '}
            <a href="https://urban-stats.printify.me" target="_blank" rel="noreferrer">
                Urban Stats Store
            </a>
            !
        </span>
    )
}
