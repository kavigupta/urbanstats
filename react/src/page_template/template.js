export { PageTemplate };

import React, { Fragment } from 'react';

import domtoimage from 'dom-to-image';

import { Header } from "../components/header.js";
import { Sidebar } from "../components/sidebar.js";
import "../common.css";
import "../components/article.css";
import { load_settings } from './settings.js';
import { mobileLayout } from '../utils/responsive.js';
import { sanitize } from '../navigation/links.js';


class PageTemplate extends React.Component {
    constructor(props) {
        super(props);

        const [settings, statistic_category_metadata_checkboxes] = load_settings();

        this.statistic_category_metadata_checkboxes = statistic_category_metadata_checkboxes;

        this.state = {
            settings: settings,
            hamburger_open: false,
            screenshot_mode: false,
        }
    }

    render() {
        const self = this;
        return (
            <Fragment>
                <meta name="viewport" content="width=600" />
                <div className={mobileLayout() ? "main_panel_mobile" : "main_panel"}>
                    <Header
                        settings={this.state.settings}
                        hamburger_open={this.state.hamburger_open}
                        set_hamburger_open={x => this.setState({hamburger_open: x})}
                        screenshot_mode={this.state.screenshot_mode}
                        initiate_screenshot={() => this.initiate_screenshot()}
                    />
                    <div className="gap"></div>
                    {this.bodyPanel()}
                </div>
            </Fragment>
        );
    }

    bodyPanel() {
        if (this.state.hamburger_open) {
            return this.leftPanel();
        }
        return <div className="body_panel">
            {mobileLayout() ? undefined : this.leftPanel()}
            <div className={mobileLayout() ? "content_panel_mobile" : "right_panel"}>
                {this.main_content()}
                <div className="gap"></div>
                <div className="centered_text">Urban Stats Version 8.1.0 by Kavi Gupta. Last updated 2024-01-01. Significant help with weather data from <a href="https://twitter.com/OklahomaPerson">OklahomaPerson</a>. Not for commercial use.</div>
            </div>
        </div>
    }

    leftPanel() {
        const self = this;
        return (
            <div className={mobileLayout() ? "left_panel_mobile" : "left_panel"}>
                <Sidebar
                    shortname={this.props.shortname}
                    source={this.props.source}
                    settings={this.state.settings}
                    set_setting={(key, value) => self.set_setting(key, value)}
                    statistic_category_metadata_checkboxes={this.statistic_category_metadata_checkboxes} />
            </div>
        )
    }

    set_setting(key, value) {
        let settings = this.state.settings;
        settings[key] = value;
        this.setState({ settings: settings });
        localStorage.setItem("settings", JSON.stringify(settings));
    }

    has_screenshot_button() {
        return false;
    }

    screencap_elements() {
        return {
            path: sanitize(this.props.joined_string) + ".png",
        }
    }

    async screencap() {
        const config = this.screencap_elements();

        console.log("Exporting");
        const table = this.table_ref.current;

        const overall_width = table.offsetWidth * 2;

        async function screencap_element(ref) {
            const scale_factor = overall_width / ref.offsetWidth;
            const link = await domtoimage.toPng(ref, {
                bgcolor: "white",
                height: ref.offsetHeight * scale_factor,
                width: ref.offsetWidth * scale_factor,
                style: {
                    transform: "scale(" + scale_factor + ")",
                    transformOrigin: "top left"
                }
            });
            return [link, scale_factor * ref.offsetHeight]
        }

        const [png_table, height_table] = await screencap_element(table);

        const map = this.map_ref.current;

        const [png_map, height_map] = await screencap_element(map);

        const canvas = document.createElement("canvas");

        const pad_around = 100;
        const pad_between = 50;

        canvas.width = overall_width + pad_around * 2;
        canvas.height = height_table + height_map + pad_around * 2 + pad_between;
        const ctx = canvas.getContext("2d");
        const img_table = new Image();
        img_table.src = png_table;
        const img_map = new Image();
        img_map.src = png_map;
        // flood the canvas with white
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // draw the images, but wait for them to load
        await new Promise((resolve, reject) => {
            img_table.onload = () => resolve();
        })
        await new Promise((resolve, reject) => {
            img_map.onload = () => resolve();
        })
        ctx.drawImage(img_table, pad_around, pad_around);
        ctx.drawImage(img_map, pad_around, pad_around + table.offsetHeight * 2 + pad_between);


        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = config.path;
        a.click();
    }

    async initiate_screenshot() {
        this.setState({ screenshot_mode: true });
        setTimeout(async () => {
            await this.screencap();
            this.setState({ screenshot_mode: false });
        })
    }

    main_content() {
        // not implemented, should be overridden
        return (<div></div>);
    }
}