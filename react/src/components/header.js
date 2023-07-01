export { Header };

import React from 'react';

import "../common.css";
import { SearchBox } from './search';

class Header extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div className="top_panel">
                <div className="left_panel"><HeaderImage /></div>
                <div className="right_panel"><SearchBox settings={this.props.settings}/></div>
            </div>
        )
    }

}

class HeaderImage extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <a href="/index.html"><img src="/banner.png" className="logo" alt="Density Database Logo" width="100%" /></a>
        )
    }
}