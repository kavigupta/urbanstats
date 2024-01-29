export { Header, HEADER_BAR_SIZE };

import React from 'react';

import "../common.css";
import { SearchBox } from './search';
import { Nav } from './hamburger';
import { mobileLayout } from '../utils/responsive';
import { ScreenshotButton } from './screenshot';
import { article_link } from '../navigation/links';

const HEADER_BAR_SIZE = "48px";

class Header extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="top_panel">
                {this.topLeft()}
                <div className="right_panel_top" style={{ height: HEADER_BAR_SIZE }}>
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
                            <SearchBox
                                settings={this.props.settings}
                                on_change={
                                    new_location => { window.location.href = article_link(new_location) }
                                }
                                placeholder="Search Urban Stats"
                                style={{
                                    fontSize: "30px",
                                    border: "1px solid #444",
                                    paddingLeft: "1em",
                                    width: "100%",
                                    verticalAlign: "middle",
                                    height: HEADER_BAR_SIZE,
                                }}
                            />
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
            <a href="/index.html"><img src={path} style={{
                height: mobileLayout() ? HEADER_BAR_SIZE : "60px",
            }} alt="Urban Stats Logo" /></a>
        )
    }
}