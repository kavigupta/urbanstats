import '@fontsource/jost/100.css'
import '@fontsource/jost/200.css'
import '@fontsource/jost/300.css'
import '@fontsource/jost/400.css'
import '@fontsource/jost/500.css'
import '@fontsource/jost/600.css'
import '@fontsource/jost/700.css'
import '@fontsource/jost/800.css'
import '@fontsource/jost/900.css'

import React, { Fragment, ReactNode, useState } from 'react'

import { Header } from '../components/header'
import { ScreencapElements, create_screenshot } from '../components/screenshot'
import { Sidebar } from '../components/sidebar'
import '../common.css'
import '../components/article.css'
import { mobileLayout } from '../utils/responsive'

export function PageTemplate({
    screencap_elements = undefined,
    has_universe_selector = false,
    universes = [],
    children,
}: {
    screencap_elements?: () => ScreencapElements
    has_universe_selector?: boolean
    universes?: string[]
    children: ({ screenshot_mode }: { screenshot_mode: boolean }) => React.ReactNode
}): ReactNode {
    const [hamburger_open, set_hamburger_open] = useState(false)
    const [screenshot_mode, set_screenshot_mode] = useState(false)

    const has_screenshot_button = screencap_elements !== undefined

    const screencap = async (curr_universe: string): Promise<void> => {
        if (screencap_elements === undefined) {
            return
        }
        try {
            await create_screenshot(screencap_elements(), has_universe_selector ? curr_universe : undefined)
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.error(e)
        }
    }

    const initiate_screenshot = (curr_universe: string): void => {
        set_screenshot_mode(true)
        setTimeout(async () => {
            await screencap(curr_universe)
            set_screenshot_mode(false)
        })
    }

    return (
        <Fragment>
            <meta name="viewport" content="width=600" />
            <div className={mobileLayout() ? 'main_panel_mobile' : 'main_panel'}>
                <Header
                    hamburger_open={hamburger_open}
                    set_hamburger_open={set_hamburger_open}
                    has_screenshot={has_screenshot_button}
                    has_universe_selector={has_universe_selector}
                    all_universes={universes}
                    screenshot_mode={screenshot_mode}
                    initiate_screenshot={(curr_universe) => { initiate_screenshot(curr_universe) }}
                />
                <div style={{ marginBlockEnd: '16px' }}></div>
                <BodyPanel
                    hamburger_open={hamburger_open}
                    main_content={children({ screenshot_mode })}
                />
            </div>
        </Fragment>
    )
}

function TemplateFooter(): ReactNode {
    return (
        <div className="centered_text">
            Urban Stats Version
            {' '}
            <Version />
            {' '}
            by
            {' '}
            <MainCredits />
            . Last updated
            {' '}
            <LastUpdated />
            .
            {' '}
            <OtherCredits />
            {' '}
            Not for commercial use.
            {' '}
            <Support />
        </div>
    )
}

function Version(): ReactNode {
    return <span id="current-version">17.0.0</span>
}

function LastUpdated(): ReactNode {
    return <span id="last-updated">2024-09-01</span>
}

function MainCredits(): ReactNode {
    return <span id="main-credits">Kavi Gupta and Luke Brody</span>
}

function OtherCredits(): ReactNode {
    return (
        <span>
            Significant help with weather data from
            {' '}
            <a href="https://twitter.com/OklahomaPerson">OklahomaPerson</a>
            .
        </span>
    )
}

function BodyPanel({ hamburger_open, main_content }: { hamburger_open: boolean, main_content: React.ReactNode }): ReactNode {
    if (hamburger_open) {
        return <LeftPanel />
    }
    return (
        <div className="body_panel">
            {mobileLayout() ? undefined : <LeftPanel />}
            <div className={mobileLayout() ? 'content_panel_mobile' : 'right_panel'}>
                {main_content}
                <div className="gap"></div>
                <TemplateFooter />
            </div>
        </div>
    )
}

function LeftPanel(): ReactNode {
    return (
        <div className={mobileLayout() ? 'left_panel_mobile' : 'left_panel'}>
            <Sidebar />
        </div>
    )
}

function Support(): ReactNode {
    return (
        <span>
            If you find urbanstats useful, please donate on
            {' '}
            <a href="https://ko-fi.com/notkavi">kofi</a>
            !
        </span>
    )
}
