export { Header };

import React from 'react';
import { isMobile } from 'react-device-detect';

import "../common.css";
import { SearchBox } from './search';
import { Nav } from './hamburger';

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
        if (isMobile) {
            return (
                <div className="left_panel_top">
                    <Nav left_panel={() => self.props.leftPanel()} />
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
        return (
            <a href="/index.html"><img src="/banner.png" className="logo" alt="Urban Stats Logo" /></a>
        )
    }
}