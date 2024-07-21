import React from 'react';

import "../common.css";
import "./header.css";
import { SearchBox } from './search';
import { Nav } from './hamburger';
import { useResponsive } from '../utils/responsive';
import { ScreenshotButton } from './screenshot';
import { article_link, universe_path } from '../navigation/links';

export const HEADER_BAR_SIZE = "48px";
const HEADER_BAR_SIZE_DESKTOP = "60px";

export function Header(props: {
    hamburger_open: boolean,
    set_hamburger_open: (newValue: boolean) => void,
    has_universe_selector: boolean,
    current_universe: string,
    all_universes: string[],
    on_universe_update: (universe: string) => void,
    has_screenshot: boolean,
    screenshot_mode: boolean,
    initiate_screenshot: () => void
}) {
    const responsive = useResponsive();
    return (
        <div className="top_panel">
            <TopLeft
                hamburger_open={props.hamburger_open}
                set_hamburger_open={props.set_hamburger_open}
                has_universe_selector={props.has_universe_selector}
                current_universe={props.current_universe}
                all_universes={props.all_universes}
                on_universe_update={props.on_universe_update}
            />
            <div className="right_panel_top" style={{ height: HEADER_BAR_SIZE }}>
                {/* flex but stretch to fill */}
                <div style={{ display: "flex", flexDirection: "row", height: "100%" }}>
                    {!responsive.mobileLayout && props.has_universe_selector
                        ? <div style={{ paddingRight: "0.5em" }}>
                            <UniverseSelector
                                current_universe={props.current_universe}
                                all_universes={props.all_universes}
                                on_universe_update={props.on_universe_update}
                            />
                        </div>
                        : undefined}
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
                                new_location => {
                                    window.location.href = article_link(
                                        props.current_universe, new_location
                                    )
                                }
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
                            autoFocus={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function TopLeft(props: {
    hamburger_open: boolean,
    set_hamburger_open: (newValue: boolean) => void,
    has_universe_selector: boolean,
    current_universe: string,
    all_universes: string[],
    on_universe_update: (universe: string) => void
}) {
    const responsive = useResponsive();
    if (responsive.mobileLayout) {
        return (
            <div className="left_panel_top">
                <Nav hamburger_open={props.hamburger_open} set_hamburger_open={props.set_hamburger_open} />
                <div className="hgap"></div>
                {
                    props.has_universe_selector ?
                        <UniverseSelector
                            current_universe={props.current_universe}
                            all_universes={props.all_universes}
                            on_universe_update={props.on_universe_update}
                        /> :
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

function HeaderImage() {
    const responsive = useResponsive();
    const path = responsive.mobileLayout ? "/thumbnail.png" : "/banner.png";
    return (
        <a href="/index.html"><img src={path} style={{
            height: responsive.mobileLayout ? HEADER_BAR_SIZE : HEADER_BAR_SIZE_DESKTOP,
        }} alt="Urban Stats Logo" /></a>
    )
}

function UniverseSelector(
    { current_universe, all_universes, on_universe_update }
    : { current_universe: string, all_universes: string[], on_universe_update: (universe: string) => void }
) {
    // button to select universe. Image is icons/flags/${universe}.png
    // when clicked, a dropdown appears with all universes, labeled by their flags

    const width = HEADER_BAR_SIZE;

    const [dropdown_open, set_dropdown_open] = React.useState(false);

    var dropdown = dropdown_open ? <UniverseDropdown
        flag_size={width}
        all_universes={all_universes}
        on_universe_update={(universe: string) => {
            set_dropdown_open(false);
            on_universe_update(universe);
        }} /> : undefined;

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
                    className="universe-selector"
                    onClick={() => set_dropdown_open(!dropdown_open)}
                />
            </div>
            {dropdown}
        </div>
    )
}

function UniverseDropdown(
    { all_universes, on_universe_update, flag_size }
    : { all_universes: string[], on_universe_update: (universe: string) => void, flag_size: string }
) {
    return (
        <div>
            <div className="serif" style={{
                fontWeight: 500,
                backgroundColor: "#f7f1e8",
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
                            <img src={universe_path(universe)} alt={universe}
                                width={flag_size}
                                className="universe-selector-option"
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