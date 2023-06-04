export { PageTemplate };

import React from 'react';

import { Header } from "../components/header.js";
import { Sidebar } from "../components/sidebar.js";
import "../common.css";
import "../components/article.css";

class PageTemplate extends React.Component {
    constructor(props) {
        super(props);
        // backed by local storage
        this.state = {
            settings: {
                use_imperial: JSON.parse(localStorage.getItem("use_imperial")) || false,
            }
        }
    }

    render() {
        const self = this;
        return (
            <div className="main_panel">
                <Header />
                <div className="gap"></div>
                <div className="body_panel">
                    <div className="left_panel">
                        <Sidebar
                            shortname={this.props.shortname}
                            source={this.props.source}
                            settings={this.state.settings}
                            set_setting={(key, value) => self.set_setting(key, value)} />
                    </div>
                    <div className="right_panel">
                        {this.main_content()}
                        <div className="gap"></div>
                        <div className="centered_text">Density Database Version 2.0.1 by Kavi Gupta. Last updated 2023-06-03.</div>
                    </div>
                </div>
            </div>
        );
    }

    set_setting(key, value) {
        let settings = this.state.settings;
        settings[key] = value;
        this.setState({ settings: settings });
        localStorage.setItem(key, value);
    }

    main_content() {
        // not implemented, should be overridden
        return (<div></div>);
    }
}
