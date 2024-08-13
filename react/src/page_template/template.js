import "@fontsource/jost/100.css";
import "@fontsource/jost/200.css";
import "@fontsource/jost/300.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "@fontsource/jost/600.css";
import "@fontsource/jost/700.css";
import "@fontsource/jost/800.css";
import "@fontsource/jost/900.css";

export { PageTemplateClass, PageTemplate };

import React, { Fragment, useState } from 'react';

import { Header } from "../components/header";
import { Sidebar } from "../components/sidebar";
import "../common.css";
import "../components/article.css";
import { mobileLayout } from '../utils/responsive';
import { create_screenshot } from '../components/screenshot';

class PageTemplateClass extends React.Component {
    render() {
        return <PageTemplate
            screencap_elements={this.screencap_elements()}
            has_universe_selector={this.has_universe_selector()}
            universes={this.props.universes}
            main_content={template_info => this.main_content(template_info)}
        />
    }

    has_universe_selector() {
        return false;
    }

    screencap_elements() {
        // not implemented, should be overridden
        return undefined;
    }

    main_content(template_info) {
        // not implemented, should be overridden
        return (<div></div>);
    }
}

function PageTemplate({
    screencap_elements,
    universes,
    main_content,
}) {
    const has_universe_selector = universes != undefined;
    const [hamburger_open, set_hamburger_open] = useState(false);
    const [screenshot_mode, set_screenshot_mode] = useState(false);

    const has_screenshot_button = screencap_elements != undefined;

    const screencap = async (curr_universe) => {
        try {
            console.log("Creating screenshot...");
            await create_screenshot(screencap_elements(), has_universe_selector ? curr_universe : undefined);
        } catch (e) {
            console.error(e);
        }
    }

    const initiate_screenshot = async curr_universe => {
        set_screenshot_mode(true)
        setTimeout(async () => {
            await screencap(curr_universe);
            set_screenshot_mode(false)
        })
    }

    const template_info = {
        screenshot_mode: screenshot_mode
    }

    return (
        <Fragment>
            <meta name="viewport" content="width=600" />
            <div className={mobileLayout() ? "main_panel_mobile" : "main_panel"}>
                <Header
                    hamburger_open={hamburger_open}
                    set_hamburger_open={set_hamburger_open}
                    has_screenshot={has_screenshot_button}
                    has_universe_selector={has_universe_selector}
                    all_universes={universes}
                    screenshot_mode={screenshot_mode}
                    initiate_screenshot={curr_universe => initiate_screenshot(curr_universe)}
                />
                <div style={{ marginBlockEnd: "16px" }}></div>
                <BodyPanel
                    hamburger_open={hamburger_open}
                    main_content={main_content(template_info)}
                />
            </div>
        </Fragment>
    );
}

function TemplateFooter() {
    return <div className="centered_text">
        Urban Stats Version <Version /> by <MainCredits />. Last updated <LastUpdated />. <OtherCredits /> Not for commercial use. <Support />
    </div>
}

function Version() {
    return <span id="current-version">16.6.1</span>
}

function LastUpdated() {
    return <span id="last-updated">2024-08-09</span>
}

function MainCredits() {
    return <span id="main-credits">Kavi Gupta and Luke Brody</span>
}

function OtherCredits() {
    return <span>
        Significant help with weather data from <a href="https://twitter.com/OklahomaPerson">OklahomaPerson</a>.
    </span>
}

function BodyPanel(props) {
    if (props.hamburger_open) {
        return <LeftPanel />
    }
    return <div className="body_panel">
        {mobileLayout() ? undefined : <LeftPanel />}
        <div className={mobileLayout() ? "content_panel_mobile" : "right_panel"}>
            {props.main_content}
            <div className="gap"></div>
            <TemplateFooter />
        </div>
    </div>
}

function LeftPanel() {
    return (
        <div className={mobileLayout() ? "left_panel_mobile" : "left_panel"}>
            <Sidebar />
        </div>
    )
}

function Support() {
    return <span>
        If you find urbanstats useful, please donate on <a href="https://ko-fi.com/notkavi">kofi</a>!
    </span>
}