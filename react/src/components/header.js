export { Header, HEADER_BAR_SIZE };

import React from 'react';

import "../common.css";
import "./header.css";
import { SearchBox } from './search';
import { Nav } from './hamburger';
import { mobileLayout } from '../utils/responsive';
import { ScreenshotButton } from './screenshot';
import { article_link } from '../navigation/links';

const HEADER_BAR_SIZE = "48px";
const HEADER_BAR_SIZE_DESKTOP = "60px";

class Header extends React.Component {
    constructor(props) {
        super(props);
    }

    universe_selector() {
        return <UniverseSelector
            current_universe={'world'}
            all_universes={['world', 'USA', "California, USA"]}
            on_universe_update={universe => console.log(universe)}
        />
    }

    render() {

        return (
            <div className="top_panel">
                {this.topLeft()}
                <div className="right_panel_top" style={{ height: HEADER_BAR_SIZE }}>
                    {/* flex but stretch to fill */}
                    <div style={{ display: "flex", flexDirection: "row", height: "100%" }}>
                        {!mobileLayout() && this.props.has_universe_selector
                            ? <div style={{ paddingRight: "0.5em" }}>
                                {this.universe_selector()}
                            </div>
                            : undefined}
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
                    {
                        this.props.has_universe_selector ?
                            this.universe_selector() :
                            <HeaderImage />
                    }
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
                height: mobileLayout() ? HEADER_BAR_SIZE : HEADER_BAR_SIZE_DESKTOP,
            }} alt="Urban Stats Logo" /></a>
        )
    }
}

function UniverseSelector({ current_universe, all_universes, on_universe_update }) {
    // button to select universe. Image is icons/flags/${universe}.png
    // when clicked, a dropdown appears with all universes, labeled by their flags

    const width = HEADER_BAR_SIZE;

    const [dropdown_open, set_dropdown_open] = React.useState(false);

    var dropdown = dropdown_open ? <UniverseDropdown
        flag_size={width}
        all_universes={all_universes}
        on_universe_update={on_universe_update} /> : undefined;

    // wrap dropdown in a div to place it in front of everything else and let it spill out of the header
    // do NOT use class

    dropdown = <div style={{
        position: "absolute",
        zIndex: "1",
        borderRadius: "0.25em",
        display: dropdown_open ? "block" : "none",
        width: "500%",
        maxHeight: "20em",
        overflowY: "auto",
    }}>{dropdown}</div>;

    return (
        <div style={{ marginBlockEnd: "0em", position: "relative", width: width }}>
            <div style={
                {
                    width: width,
                    height: width,
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                }
            }>
                <img src={`/icons/flags/${current_universe}.png`} alt={current_universe} width={width}
                    onClick={() => set_dropdown_open(!dropdown_open)}
                />
            </div>
            {dropdown}
        </div>
    )
}

function UniverseDropdown({ all_universes, on_universe_update, flag_size }) {
    return (
        <div>
            <div className="serif" style={{
                fontWeight: "bold",
                backgroundColor: "#ebebff",
            }}
            >
                Select universe for statistics
            </div>
            {all_universes.map(universe => {
                return (
                    <div key={universe} onClick={() => on_universe_update(universe)}>
                        <div style={{
                            display: "flex",
                            flexDirection: "row",
                            gap: "1em",
                            // center vertically
                            alignItems: "center",
                            cursor: "pointer",
                            padding: "0.5em",
                        }}
                            className="hoverable_elements"
                        >
                            <img src={`/icons/flags/${universe}.png`} alt={universe}
                                width={HEADER_BAR_SIZE}
                            />
                            <div className="serif">
                                {universe == "world" ? "World" : universe}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div >
    )
}