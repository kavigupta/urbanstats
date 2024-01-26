export { Header };

import React from 'react';

import "../common.css";
import { SearchBox } from './search';
import { Nav } from './hamburger';
import { mobileLayout } from '../utils/responsive';
import { ScreenshotButton } from './screenshot';

class Header extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="top_panel">
                {this.topLeft()}
                <div className="right_panel_top">
                    {/* flex but stretch to fill */}
                    <div style={{ display: "flex", flexDirection: "row", height: "100%" }}>
                        {
                            this.props.has_screenshot ?
                                <ScreenshotButton
                                    screenshot_mode={this.props.screenshot_mode}
                                    onClick={this.props.initiate_screenshot}
                                /> : undefined
                        }
                        <div className="hgap"></div>
                        <div style={{ flexGrow: 1 }}>
                            <SearchBox settings={this.props.settings} />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    topLeft() {
        const self = this;
        if (mobileLayout()) {
            return (
                <div className="left_panel_top">
                    <Nav hamburger_open={this.props.hamburger_open} set_hamburger_open={this.props.set_hamburger_open} />
                    <div className="hgap"></div>
                    <HeaderImage />
                </div>
            );
        } else {
            return (
                <div className="left_panel_top">
                    <HeaderImage />
                </div>
            );
        }

    }
}

class HeaderImage extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const path = mobileLayout() ? "/thumbnail.png" : "/banner.png";
        return (
            <a href="/index.html"><img src={path} className="logo" alt="Urban Stats Logo" /></a>
        )
    }
}