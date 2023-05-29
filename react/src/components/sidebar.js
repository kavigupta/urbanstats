export { Sidebar };

import React from 'react';

import "../style.css";
import "./sidebar.css";

class Sidebar extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
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
            </div>
        );
    }
}