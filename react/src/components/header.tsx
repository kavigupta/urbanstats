import React, { ReactNode } from 'react'

import '../common.css'
import './header.css'
import flag_dimensions from '../data/flag_dimensions'
import { article_link, universe_path } from '../navigation/links'
import { useColors } from '../page_template/colors'
import { set_universe, useUniverse } from '../universe'
import { useMobileLayout } from '../utils/responsive'

import { Nav } from './hamburger'
import { ScreenshotButton } from './screenshot'
import { SearchBox } from './search'

export const HEADER_BAR_SIZE = 48
const FLAG_ICON_MAX_HEIGHT_PCT = 0.85
const HEADER_BAR_SIZE_DESKTOP = '60px'

function useFlagIconWidthRatio(): number {
    if (useMobileLayout()) {
        return 1
    }
    return 1.8
}

export function Header(props: {
    hamburger_open: boolean
    set_hamburger_open: (newValue: boolean) => void
    has_universe_selector: boolean
    all_universes: readonly string[]
    has_screenshot: boolean
    initiate_screenshot: (curr_universe: string) => void
}): ReactNode {
    const curr_universe = useUniverse()
    return (
        <div className="top_panel">
            <TopLeft
                hamburger_open={props.hamburger_open}
                set_hamburger_open={props.set_hamburger_open}
                has_universe_selector={props.has_universe_selector}
                all_universes={props.all_universes}
            />
            <div className="right_panel_top" style={{ height: `${HEADER_BAR_SIZE}px` }}>
                {/* flex but stretch to fill */}
                <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
                    {!useMobileLayout() && props.has_universe_selector
                        ? (
                                <div style={{ paddingRight: '0.5em' }}>
                                    <UniverseSelector
                                        all_universes={props.all_universes}
                                    />
                                </div>
                            )
                        : undefined}
                    {
                        props.has_screenshot
                            ? (
                                    <ScreenshotButton
                                        onClick={() => { props.initiate_screenshot(curr_universe) }}
                                    />
                                )
                            : undefined
                    }
                    <div className="hgap"></div>
                    <div style={{ flexGrow: 1 }}>
                        <SearchBox
                            on_change={
                                (new_location) => {
                                    window.location.href = article_link(
                                        curr_universe, new_location,
                                    )
                                }
                            }
                            placeholder="Search Urban Stats"
                            style={{
                                fontSize: '30px',
                                paddingLeft: '1em',
                                width: '100%',
                                verticalAlign: 'middle',
                                height: `${HEADER_BAR_SIZE}px`,
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
    hamburger_open: boolean
    set_hamburger_open: (newValue: boolean) => void
    has_universe_selector: boolean
    all_universes: readonly string[]
}): ReactNode {
    if (useMobileLayout()) {
        return (
            <div className="left_panel_top">
                <Nav hamburger_open={props.hamburger_open} set_hamburger_open={props.set_hamburger_open} />
                <div className="hgap"></div>
                {
                    props.has_universe_selector
                        ? (
                                <UniverseSelector
                                    all_universes={props.all_universes}
                                />
                            )
                        : <HeaderImage />
                }
            </div>
        )
    }
    else {
        return (
            <div className="left_panel_top">
                <HeaderImage />
            </div>
        )
    }
}

function HeaderImage(): ReactNode {
    const colors = useColors()
    const path = useMobileLayout() ? '/thumbnail.png' : colors.bannerURL
    return (
        <a href="/index.html">
            <img
                src={path}
                style={{
                    height: useMobileLayout() ? `${HEADER_BAR_SIZE}px` : HEADER_BAR_SIZE_DESKTOP,
                }}
                alt="Urban Stats Logo"
            />
        </a>
    )
}

function UniverseSelector(
    { all_universes }: { all_universes: readonly string[] },
): ReactNode {
    const curr_universe = useUniverse()
    // button to select universe. Image is icons/flags/${universe}.png
    // when clicked, a dropdown appears with all universes, labeled by their flags

    const width = HEADER_BAR_SIZE * useFlagIconWidthRatio()

    const [dropdown_open, set_dropdown_open] = React.useState(false)

    let dropdown = dropdown_open
        ? (
                <UniverseDropdown
                    flag_size={HEADER_BAR_SIZE}
                    all_universes={all_universes}
                />
            )
        : undefined

    // wrap dropdown in a div to place it in front of everything else and let it spill out of the header
    // do NOT use class

    dropdown = (
        <div style={{
            position: 'absolute',
            zIndex: '1',
            borderRadius: '0.25em',
            display: dropdown_open ? 'block' : 'none',
            width: '500%',
            maxHeight: '20em',
            overflowY: 'auto',
        }}
        >
            {dropdown}
        </div>
    )

    return (
        <div style={{ marginBlockEnd: '0em', position: 'relative', width: `${width}px` }}>
            <div style={
                {
                    width,
                    height: `${HEADER_BAR_SIZE}px`,
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                }
            }
            >
                <Flag
                    height={HEADER_BAR_SIZE}
                    onClick={() => { set_dropdown_open(!dropdown_open) }}
                    universe={curr_universe}
                />
            </div>
            {dropdown}
        </div>
    )
}

function Flag(props: { height: number, onClick?: () => void, universe: string }): ReactNode {
    const width = props.height * useFlagIconWidthRatio()
    const imageAR = flag_dimensions[props.universe]
    const usableHeight = props.height * FLAG_ICON_MAX_HEIGHT_PCT
    const usableWidth = Math.min(usableHeight * imageAR, width)

    return (
        <div style={{ width, height: props.height, display: 'flex' }}>
            <img
                style={{
                    margin: 'auto',
                }}
                src={universe_path(props.universe)}
                alt={props.universe}
                width={`${usableWidth}px`}
                className="universe-selector"
                onClick={props.onClick}
            />
        </div>
    )
}

function UniverseDropdown(
    { all_universes, flag_size }: { all_universes: readonly string[], flag_size: number },
): ReactNode {
    const colors = useColors()
    return (
        <div>
            <div
                className="serif"
                style={{
                    fontWeight: 500,
                    backgroundColor: colors.slightlyDifferentBackground,
                }}
            >
                Select universe for statistics
            </div>
            {all_universes.map((alt_universe) => {
                return (
                    <div key={alt_universe} onClick={() => { set_universe(alt_universe) }}>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '1em',
                                // center vertically
                                alignItems: 'center',
                                cursor: 'pointer',
                                padding: '0.5em',
                            }}
                            className="hoverable_elements"
                        >
                            <Flag
                                height={flag_size}
                                universe={alt_universe}
                            />
                            <div className="serif">
                                {alt_universe === 'world' ? 'World' : alt_universe}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
