export { PageTemplate };

import React, { Fragment } from 'react';
import { isMobile } from 'react-device-detect';

import { Header } from "../components/header.js";
import { Sidebar } from "../components/sidebar.js";
import "../common.css";
import "../components/article.css";
import { relationship_key } from '../components/related-button.js';

class PageTemplate extends React.Component {
    constructor(props) {
        super(props);
        // backed by local storage
        let settings = JSON.parse(localStorage.getItem("settings")) || {};
        const map_relationship = require("../data/map_relationship.json");
        for (let i in map_relationship) {
            const key = relationship_key(map_relationship[i][0], map_relationship[i][1]);
            if (!(key in settings)) {
                settings[key] = true;
            }
        }
        if (!("use_population_percentiles" in settings)) {
            settings["use_population_percentiles"] = true;
        }
        const statistic_category_metadata = require("../data/statistic_category_metadata.json");
        // list of {key, name, show_checkbox, default}
        this.statistic_category_metadata_checkboxes = [];
        for (let i in statistic_category_metadata) {
            const key = statistic_category_metadata[i]["key"];
            const setting_key = "show_statistic_" + key;
            if (!(setting_key in settings)) {
                settings[setting_key] = statistic_category_metadata[i]["default"];
            }
            if (statistic_category_metadata[i]["show_checkbox"]) {
                this.statistic_category_metadata_checkboxes.push({
                    setting_key: setting_key,
                    name: statistic_category_metadata[i]["name"],
                });
            }
        }

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
                            <div className="centered_text">Urban Stats Version 6.4.0 by Kavi Gupta. Last updated 2023-10-02. Significant help with weather data from <a href="https://twitter.com/OklahomaPerson">OklahomaPerson</a>.</div>
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