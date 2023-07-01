export { Sidebar };

import React from 'react';

import "../style.css";
import "./sidebar.css";

import { uniform, by_population } from "../navigation/random.js";

class Sidebar extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let settings = this.props.settings;
        return (
            <div className="serif sidebar">
                <div className="sidebar-section">
                    <div className="sidebar-section-title">Main Menu</div>
                    <ul className="sidebar-section-content">
                        <li>
                            <a href="/">Home</a>
                        </li>
                        <li>
                            <a href="/about.html">About Density Database</a>
                        </li>
                        <li>
                            <a href="/data-credit.html">Data Credit</a>
                        </li>
                    </ul>
                </div>
                <div className="sidebar-section">
                    <div className="sidebar-section-title">Random</div>
                    <ul className="sidebar-section-content">
                        <li>
                            <a href="#" onClick={() => uniform(settings)}>Unweighted</a>
                        </li>
                        <li>
                            <a href="#" onClick={() => by_population(settings)}>Weighted by Population</a>
                        </li>
                    </ul>
                </div>
                <div className="sidebar-section">
                    <div className="sidebar-section-title">Settings</div>
                    <ul className="sidebar-section-content">
                        <li>
                        <CheckboxSetting
                                name="Use Imperial Units"
                                setting_key="use_imperial"
                                settings={this.props.settings}
                                set_setting={this.props.set_setting}
                            />
                            <CheckboxSetting
                                name="Include Historical Districts"
                                setting_key="show_historical_cds"
                                settings={this.props.settings}
                                set_setting={this.props.set_setting}
                            />
                        </li>
                    </ul>
                </div>
            </div>
        );
    }
}

const CheckboxSetting = props => {

    return (
        <div>
            <input
                type="checkbox"
                checked={props.settings[props.setting_key]}
                onChange={e => { props.set_setting(props.setting_key, e.target.checked) }}
            />
            <label>{props.name}</label>
        </div>
    );
};
