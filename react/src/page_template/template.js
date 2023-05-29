export { create_page };

import React from 'react';

import { Header } from "../components/header.js";
import { Sidebar } from "../components/sidebar.js";
import "../common.css";
import "../components/article.css";

function create_page(props, main_content) {
    return (
        <div className="main_panel">
            <Header />
            <div className="gap"></div>
            <div className="body_panel">
                <div className="left_panel">
                    <Sidebar shortname={props.shortname} source={props.source} />
                </div>
                <div className="right_panel">
                    {main_content}
                    <div className="gap"></div>
                    <div className="text">Density Database Version 1.3.4 by Kavi Gupta. Last updated 2023-05-28.</div>
                </div>
            </div>
        </div>
    );
}
