import React, { Fragment, useState } from 'react';

import { Header } from "../components/header";
import { Sidebar } from "../components/sidebar";
import "../common.css";
import "../components/article.css";
import { useResponsive } from '../utils/responsive';
import { ScreencapElements, create_screenshot } from '../components/screenshot';

export function PageTemplate(props: { mainContent: React.ReactNode, hasScreenshotButton: boolean, screencapElements: ScreencapElements }) {
    const [hamburger_open, set_hamburger_open] = useState(false);
    const [screenshot_mode, set_screenshot_mode] = useState(false);
    
    const responsive = useResponsive()

    const initiateScreenshot = () => {
        set_screenshot_mode(true)
        setTimeout(async () => {
            await create_screenshot(props.screencapElements)
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
                />
                <div className="gap"></div>
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
            <div className="centered_text">Urban Stats Version 9.3.0 by Kavi Gupta. Last updated 2024-02-09. Significant help with weather data from <a href="https://twitter.com/OklahomaPerson">OklahomaPerson</a>. Not for commercial use.</div>
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