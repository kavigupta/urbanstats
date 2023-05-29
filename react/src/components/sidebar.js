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
            <div className="serif">
                <div className="text shortname">Sidebar</div>
            </div>
        );
    }
}