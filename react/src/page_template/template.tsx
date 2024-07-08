import React, { Fragment, useState } from 'react';

import { Header } from "../components/header";
import { Sidebar } from "../components/sidebar";
import "../common.css";
import "../components/article.css";
import { useResponsive } from '../utils/responsive';
import { ScreencapElements, create_screenshot } from '../components/screenshot';
import { set_universe } from '../universe.ts';

export function PageTemplate(props: {
    mainContent: React.ReactNode, hasScreenshotButton: boolean,
    screencapElements: ScreencapElements, hasUniverseSelector: boolean,
    all_universes: string[], universe: string
}) {
    const [hamburger_open, set_hamburger_open] = useState(false);
    const [screenshot_mode, set_screenshot_mode] = useState(false);
    const [current_universe, set_current_universe_direct] = useState(props.universe);

    const set_current_universe = (universe: string) => {
        set_current_universe_direct(universe);
        set_universe(universe);
    };

    const responsive = useResponsive()

    const initiateScreenshot = () => {
        set_screenshot_mode(true)
        setTimeout(async () => {
            try {
                await create_screenshot(props.screencapElements, props.hasUniverseSelector ? current_universe : undefined);
            } catch (e) {
                console.error(e);
            }
            set_screenshot_mode(false)
        })
    }

    return (
        <Fragment>
            <meta name="viewport" content="width=600" />
            <div className={responsive.mobileLayout ? "main_panel_mobile" : "main_panel"}>
                <Header
                    hamburger_open={hamburger_open}
                    set_hamburger_open={set_hamburger_open}
                    has_screenshot={props.hasScreenshotButton}
                    screenshot_mode={screenshot_mode}
                    initiate_screenshot={initiateScreenshot}
                    has_universe_selector={props.hasUniverseSelector}
                    current_universe={current_universe}
                    all_universes={props.all_universes}
                    on_universe_update={set_current_universe}

                />
                <div style={{ marginBlockEnd: "16px" }}></div>
                <BodyPanel mainContent={props.mainContent} hamburger_open={hamburger_open} />
            </div>
        </Fragment>
    );
}

function BodyPanel(props: { mainContent: React.ReactNode, hamburger_open: boolean }) {
    const responsive = useResponsive()
    if (props.hamburger_open) {
        return <LeftPanel />;
    }
    return <div className="body_panel">
        {responsive.mobileLayout ? undefined : <LeftPanel />}
        <div className={responsive.mobileLayout ? "content_panel_mobile" : "right_panel"}>
            {props.mainContent}
            <div className="gap"></div>
            <TemplateFooter />
        </div>
    </div>
}

function LeftPanel() {
    const responsive = useResponsive()
    return (
        <div className={responsive.mobileLayout ? "left_panel_mobile" : "left_panel"}>
            <Sidebar />
        </div>
    )
}



function TemplateFooter() {
    return <div className="centered_text">
        Urban Stats Version <Version /> by <MainCredits />. Last updated <LastUpdated />. <OtherCredits /> Not for commercial use.
    </div>
}

function Version() {
    return <span id="current-version">15.2.0</span>
}

function LastUpdated() {
    return <span id="last-updated">2024-07-07</span>
}

function MainCredits() {
    return <span id="main-credits">Kavi Gupta</span>
}

function OtherCredits() {
    return <span>
        Significant help with weather data from <a href="https://twitter.com/OklahomaPerson">OklahomaPerson</a>.
    </span>
}