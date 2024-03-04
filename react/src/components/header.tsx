import React from 'react';

import "../common.css";
import { SearchBox } from './search';
import { Nav } from './hamburger';
import { useResponsive } from '../utils/responsive';
import { ScreenshotButton } from './screenshot';
import { article_link } from '../navigation/links';

export const HEADER_BAR_SIZE = "48px";

export function Header(props: {
    hamburger_open: boolean,
    set_hamburger_open: (newValue: boolean) => void,
    has_screenshot: boolean,
    screenshot_mode: boolean,
    initiate_screenshot: () => void
}) {
    return (
        <div className="top_panel">
            <TopLeft hamburger_open={props.hamburger_open} set_hamburger_open={props.set_hamburger_open}/>
            <div className="right_panel_top" style={{ height: HEADER_BAR_SIZE }}>
                {/* flex but stretch to fill */}
                <div style={{ display: "flex", flexDirection: "row", height: "100%" }}>
                    {
                        props.has_screenshot ?
                            <ScreenshotButton
                                screenshot_mode={props.screenshot_mode}
                                onClick={props.initiate_screenshot}
                            /> : undefined
                    }
                    <div className="hgap"></div>
                    <div style={{ flexGrow: 1 }}>
                        <SearchBox
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

function TopLeft(props: { hamburger_open: boolean, set_hamburger_open: (newValue: boolean) => void }) {
    const responsive = useResponsive()
    if (responsive.mobileLayout) {
        return (
            <div className="left_panel_top">
                <Nav hamburger_open={props.hamburger_open} set_hamburger_open={props.set_hamburger_open} />
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

function HeaderImage() {
    const responsive = useResponsive()
    const path = responsive.mobileLayout ? "/thumbnail.png" : "/banner.png";
    return (
        <a href="/index.html"><img src={path} style={{
            height: responsive.mobileLayout ? HEADER_BAR_SIZE : "60px",
        }} alt="Urban Stats Logo" /></a>
    )
}