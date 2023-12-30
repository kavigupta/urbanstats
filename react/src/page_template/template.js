export { PageTemplate };

import React, { Fragment } from 'react';
import { isMobile } from 'react-device-detect';

import { Header } from "../components/header.js";
import { Sidebar } from "../components/sidebar.js";
import "../common.css";
import "../components/article.css";
import { load_settings } from './settings.js';


class PageTemplate extends React.Component {
    constructor(props) {
        super(props);

        const [settings, statistic_category_metadata_checkboxes] = load_settings();

        this.statistic_category_metadata_checkboxes = statistic_category_metadata_checkboxes;

        this.state = {
            settings: settings
        }
    }

    render() {
        const self = this;
        return (
            <Fragment>
                <meta name="viewport" content="width=600" />
                <div className={isMobile ? "main_panel_mobile" : "main_panel"}>
                    <Header settings={this.state.settings} leftPanel={() => self.leftPanel()} />
                    <div className="gap"></div>
                    <div className="body_panel">
                        {isMobile ? undefined : self.leftPanel()}
                        <div className={isMobile ? "content_panel_mobile" : "right_panel"}>
                            {this.main_content()}
                            <div className="gap"></div>
                            <div className="centered_text">Urban Stats Version 8.0.1 by Kavi Gupta. Last updated 2023-10-14. Significant help with weather data from <a href="https://twitter.com/OklahomaPerson">OklahomaPerson</a>. Not for commercial use.</div>
                        </div>
                    </div>
                </div>
            </Fragment>
        );
    }

    leftPanel() {
        const self = this;
        return (
            <div className={isMobile ? "left_panel_mobile" : "left_panel"}>
                <Sidebar
                    shortname={this.props.shortname}
                    source={this.props.source}
                    settings={this.state.settings}
                    set_setting={(key, value) => self.set_setting(key, value)}
                    statistic_category_metadata_checkboxes={this.statistic_category_metadata_checkboxes} />
            </div>
        )
    }

    set_setting(key, value) {
        let settings = this.state.settings;
        settings[key] = value;
        this.setState({ settings: settings });
        localStorage.setItem("settings", JSON.stringify(settings));
    }

    main_content() {
        // not implemented, should be overridden
        return (<div></div>);
    }
}