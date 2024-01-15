export { Header };

import React from 'react';

import "../common.css";
import { SearchBox } from './search';
import { Nav } from './hamburger';
import { mobileLayout } from '../utils/responsive';

class Header extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="top_panel">
                {this.topLeft()}
                <div className="right_panel_top"><SearchBox settings={this.props.settings} /></div>
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