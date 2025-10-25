import '@fontsource/jost/100.css'
import '@fontsource/jost/200.css'
import '@fontsource/jost/300.css'
import '@fontsource/jost/400.css'
import '@fontsource/jost/500.css'
import '@fontsource/jost/600.css'
import '@fontsource/jost/700.css'
import '@fontsource/jost/800.css'
import '@fontsource/jost/900.css'

import React, { ReactNode, useEffect, useState } from 'react'

import { exportToCSV, CSVExportData } from '../components/csv-export'
import { Header } from '../components/header'
import { ScreencapElements, ScreenshotContext, createScreenshot } from '../components/screenshot'
import { Sidebar } from '../components/sidebar'
import '../common.css'
import '../components/article.css'
import { TestUtils } from '../utils/TestUtils'
import { useMobileLayout } from '../utils/responsive'

import { useColors, useJuxtastatColors } from './colors'

export function PageTemplate({
    screencapElements = undefined,
    csvExportData = undefined,
    hasUniverseSelector = false,
    universes = [],
    children,
    showFooter = true,
}: {
    screencapElements?: () => ScreencapElements
    csvExportData?: CSVExportData
    hasUniverseSelector?: boolean
    universes?: readonly string[]
    children?: React.ReactNode
    showFooter?: boolean
}): ReactNode {
    const [hamburgerOpen, setHamburgerOpen] = useState(false)
    const [screenshotMode, setScreenshotMode] = useState(false)
    const colors = useColors()
    const juxtaColors = useJuxtastatColors()
    const mobileLayout = useMobileLayout()

    useEffect(() => {
        document.body.style.backgroundColor = colors.background
        document.body.style.color = colors.textMain
        document.documentElement.style.setProperty('--quiz-plain-bg', colors.unselectedButton)
        document.documentElement.style.setProperty('--quiz-selected-bg', colors.selectedButton)
        document.documentElement.style.setProperty('--quiz-correct', juxtaColors.correct)
        document.documentElement.style.setProperty('--quiz-incorrect', juxtaColors.incorrect)
        document.documentElement.style.setProperty('--slightly-different-background', colors.slightlyDifferentBackground)
        document.documentElement.style.setProperty('--slightly-different-background-focused', colors.slightlyDifferentBackgroundFocused)
        document.documentElement.style.setProperty('--blue-link', colors.blueLink)
        document.documentElement.style.setProperty('--text-main-opposite', colors.textMainOpposite)
        document.documentElement.style.setProperty('--text-main', colors.textMain)
        document.documentElement.style.setProperty('--ordinal-text-color', colors.ordinalTextColor)
        document.documentElement.style.setProperty('--background', colors.background)
        document.documentElement.style.setProperty('--highlight', colors.highlight)
        document.documentElement.style.setProperty('--border-non-shadow', colors.borderNonShadow)
    }, [colors, juxtaColors])

    useEffect(() => {
        if (!mobileLayout && hamburgerOpen) {
            setHamburgerOpen(false)
        }
    }, [hamburgerOpen, mobileLayout])

    const hasScreenshotButton = screencapElements !== undefined
    const hasCSVButton = csvExportData !== undefined

    const exportCSV = (): void => {
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

    const screencap = async (currentUniverse: string | undefined): Promise<void> => {
        if (screencapElements === undefined) {
            return
        }
        try {
            await createScreenshot(screencapElements(), currentUniverse, colors)
        }
        catch (e) {
            console.error(e)
        }
    }

    const initiateScreenshot = (currentUniverse: string | undefined): void => {
        setScreenshotMode(true)
        setTimeout(async () => {
            await screencap(currentUniverse)
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
                    hasUniverseSelector={hasUniverseSelector}
                    allUniverses={universes}
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
            {TestUtils.shared.isTesting ? '<VERSION>' : '30.3.6'}
        </span>
    )
}

function LastUpdated(): ReactNode {
    return (
        <span id="last-updated">
            {TestUtils.shared.isTesting ? '<LAST UPDATED>' : '2025-10-25'}
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

function BodyPanel({ hamburgerOpen, mainContent, showFooter, setHamburgerOpen }: { hamburgerOpen: boolean, mainContent: React.ReactNode, showFooter: boolean, setHamburgerOpen: (open: boolean) => void }): ReactNode {
    const mobileLayout = useMobileLayout()

    if (hamburgerOpen) {
        return <LeftPanel setHamburgerOpen={setHamburgerOpen} />
    }
    return (
        <div className="body_panel">
            {mobileLayout ? undefined : <LeftPanel setHamburgerOpen={setHamburgerOpen} />}
            <div className={mobileLayout ? 'content_panel_mobile' : 'right_panel'}>
                {mainContent}
                <div className="gap"></div>
                { showFooter ? <TemplateFooter /> : null }
            </div>
        </div>
    )
}

function LeftPanel({ setHamburgerOpen }: { setHamburgerOpen: (open: boolean) => void }): ReactNode {
    return (
        <div className={useMobileLayout() ? 'left_panel_mobile' : 'left_panel'}>
            <Sidebar onNavigate={() => { setHamburgerOpen(false) }} />
        </div>
    )
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
