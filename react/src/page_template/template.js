import "@fontsource/jost/100.css";
import "@fontsource/jost/200.css";
import "@fontsource/jost/300.css";
import "@fontsource/jost/400.css";
import "@fontsource/jost/500.css";
import "@fontsource/jost/600.css";
import "@fontsource/jost/700.css";
import "@fontsource/jost/800.css";
import "@fontsource/jost/900.css";

export { PageTemplate };

import React, { Fragment } from 'react';

import { Header } from "../components/header";
import { Sidebar } from "../components/sidebar";
import "../common.css";
import "../components/article.css";
import { load_settings } from './settings';
import { mobileLayout } from '../utils/responsive';
import { create_screenshot } from '../components/screenshot';
import { set_universe } from '../universe';

class PageTemplate extends React.Component {

    constructor(props) {
        super(props);


        this.state = {
            hamburger_open: false,
            screenshot_mode: false,
            current_universe: this.props.universe,
        }
    }

    render() {
        const self = this;

        const set_this_universe = universe => {
            set_universe(universe);
        }

        const initiate_screenshot = async () => {
            self.setState({ screenshot_mode: true });
            setTimeout(async () => {
                await self.screencap();
                self.setState({ screenshot_mode: false });
            })
        }

        return (
            <Fragment>
                <meta name="viewport" content="width=600" />
                <div className={mobileLayout() ? "main_panel_mobile" : "main_panel"}>
                    <Header
                        hamburger_open={this.state.hamburger_open}
                        set_hamburger_open={x => this.setState({ hamburger_open: x })}
                        has_screenshot={this.has_screenshot_button()}
                        has_universe_selector={this.has_universe_selector()}
                        all_universes={this.props.universes}
                        on_universe_update={set_this_universe}
                        screenshot_mode={this.state.screenshot_mode}
                        initiate_screenshot={() => initiate_screenshot()}
                    />
                    <div style={{ marginBlockEnd: "16px" }}></div>
                    <BodyPanel
                        hamburger_open={this.state.hamburger_open}
                        main_content={this.main_content()}
                    />
                </div>
            </Fragment>
        );
    }

    has_screenshot_button() {
        return false;
    }

    has_universe_selector() {
        return false;
    }

    screencap_elements() {
        // not implemented, should be overridden
        return {
            path: undefined,
            overall_width: undefined,
            elements_to_render: undefined,
        }
    }

    async screencap() {
        const config = this.screencap_elements();

        try {
            console.log("Creating screenshot...");
            await create_screenshot(config, this.has_universe_selector() ? this.state.current_universe : undefined);
        } catch (e) {
            console.error(e);
        }
    }

    main_content() {
        // not implemented, should be overridden
        return (<div></div>);
    }
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

function LeftPanel(props) {
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