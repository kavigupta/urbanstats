export { Sidebar, CheckboxSetting };

import React from 'react';

import "../style.css";
import "./sidebar.css";
import { mobileLayout } from '../utils/responsive';

class Sidebar extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let settings = this.props.settings;
        let statistic_category_metadata_checkboxes = this.props.statistic_category_metadata_checkboxes;
        let sidebar_section_content = "sidebar-section-content";
        let sidebar_section_title = "sidebar-section-title";
        if (mobileLayout()) {
            sidebar_section_content += " sidebar-section-content_mobile";
            sidebar_section_title += " sidebar-section-title_mobile";
        }
        return (
            <div className={"serif sidebar" + (mobileLayout() ? "_mobile" : "")}>
                <div className="sidebar-section">
                    <div className={sidebar_section_title}>Main Menu</div>
                    <ul className={sidebar_section_content}>
                        <li>
                            <a href="/">Home</a>
                        </li>
                        <li>
                            <a href="/about.html">About Urban Stats</a>
                        </li>
                        <li>
                            <a href="/data-credit.html">Data Credit</a>
                        </li>
                        <li>
                            <a href="/mapper.html">Mapper (beta)</a>
                        </li>
                    </ul>
                </div>
                <div className="sidebar-section">
                    <div className={sidebar_section_title}>Random</div>
                    <ul className={sidebar_section_content}>
                        <li>
                            <a href="/random.html">Unweighted</a>
                        </li>
                        <li>
                            <a href="/random.html?sampleby=population&us_only=false">Weighted by Population</a>
                        </li>
                        <li>
                            <a href="/random.html?sampleby=population&us_only=true">Weighted by Population (US only)</a>
                        </li>
                    </ul>
                </div>
                <div className="sidebar-section">
                    <div className={sidebar_section_title}>Games</div>
                    <ul className={sidebar_section_content}>
                        <li>
                            <a href="/quiz.html">Juxtastat</a>
                        </li>
                        <li>
                            <a href="/quiz.html?mode=retro">Retrostat</a>
                        </li>
                    </ul>
                </div>
                <div className="sidebar-section">
                    <div className={sidebar_section_title}>Settings</div>
                    <ul className={sidebar_section_content}>
                        <li>
                            <CheckboxSetting
                                name="Use Imperial Units"
                                setting_key="use_imperial"
                                settings={this.props.settings}
                                set_setting={this.props.set_setting}
                            />
                        </li>
                        <li>
                            <CheckboxSetting
                                name="Include Historical Districts"
                                setting_key="show_historical_cds"
                                settings={this.props.settings}
                                set_setting={this.props.set_setting}
                            />
                        </li>
                        <li>
                            <CheckboxSetting
                                name="Use Population Percentiles"
                                setting_key="use_population_percentiles"
                                settings={this.props.settings}
                                set_setting={this.props.set_setting}
                            />
                        </li>
                    </ul>
                </div>
                <div className="sidebar-section">
                    <div className={sidebar_section_title}>Statistic Categories</div>
                    <ul className={sidebar_section_content}>
                        {statistic_category_metadata_checkboxes.map((checkbox, i) =>
                            <li key={i}>
                                <CheckboxSetting
                                    name={checkbox.name}
                                    setting_key={checkbox.setting_key}
                                    settings={this.props.settings}
                                    set_setting={this.props.set_setting}
                                />
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        );
    }
}

const CheckboxSetting = props => {

    return (
        <div class="checkbox-setting">
            <input
                type="checkbox"
                checked={props.settings[props.setting_key] || false}
                onChange={e => { props.set_setting(props.setting_key, e.target.checked) }}
            />
            <label>{props.name}</label>
        </div>
    );
};
