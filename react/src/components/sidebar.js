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
                            <a href="#" onClick={uniform}>Unweighted</a>
                        </li>
                        <li>
                            <a href="#" onClick={by_population}>Weighted by Population</a>
                        </li>
                    </ul>
                </div>
            </div>
        );
    }
}