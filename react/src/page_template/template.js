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
import { load_settings } from './settings.js';
import { mobileLayout } from '../utils/responsive';
import { create_screenshot } from '../components/screenshot';
import { set_universe } from '../universe';


class PageTemplate extends React.Component {
    constructor(props) {
        super(props);

        const [settings, statistic_category_metadata_checkboxes] = load_settings();

        this.statistic_category_metadata_checkboxes = statistic_category_metadata_checkboxes;

        this.state = {
            settings: settings,
            hamburger_open: false,
            screenshot_mode: false,
            current_universe: this.props.universe,
        }
    }

    render() {
        const self = this;


        function set_setting(key, value) {
            let settings = self.state.settings;
            settings[key] = value;
            self.setState({ settings: settings });
            localStorage.setItem("settings", JSON.stringify(settings));
        }

        const set_universe = universe => {
            self.setState({ current_universe: universe });
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
                        settings={this.state.settings}
                        hamburger_open={this.state.hamburger_open}
                        set_hamburger_open={x => this.setState({ hamburger_open: x })}
                        has_screenshot={this.has_screenshot_button()}
                        has_universe_selector={this.has_universe_selector()}
                        current_universe={this.state.current_universe}
                        all_universes={this.props.universes}
                        on_universe_update={set_universe}
                        screenshot_mode={this.state.screenshot_mode}
                        initiate_screenshot={() => initiate_screenshot()}
                    />
                    <div style={{ marginBlockEnd: "16px" }}></div>
                    <BodyPanel
                        hamburger_open={this.state.hamburger_open}
                        settings={this.state.settings}
                        set_setting={set_setting(key, value)}
                        main_content={this.main_content()}
                        statistic_category_metadata={this.statistic_category_metadata_checkboxes}
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
        Urban Stats Version <Version /> by <MainCredits />. Last updated <LastUpdated />. <OtherCredits /> Not for commercial use.
    </div>
}

function Version() {
    return <span id="current-version">16.6.0</span>
}

function LastUpdated() {
    return <span id="last-updated">2024-07-21</span>
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
        return <LeftPanel
            settings={props.settings}
            set_setting={props.set_setting}
            statistic_category_metadata_checkboxes={props.statistic_category_metadata}
        />
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
            <Sidebar
                settings={props.settings}
                set_setting={props.set_setting}
                statistic_category_metadata_checkboxes={props.statistic_category_metadata_checkboxes} />
        </div>
    )
}