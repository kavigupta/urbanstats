import React, { ReactNode, useContext } from 'react'

import '../common.css'
import './header.css'
import flag_dimensions from '../data/flag_dimensions'
import { universePath } from '../navigation/links'
import { Navigator } from '../navigation/navigator'
import { useColors } from '../page_template/colors'
import { useUniverse } from '../universe'
import { useMobileLayout } from '../utils/responsive'

import { Nav } from './hamburger'
import { ScreenshotButton } from './screenshot'
import { SearchBox } from './search'

export const headerBarSize = 48
const flagIconWidthRatio = 1.8
const flagIconMaxHeightPercent = 0.85
const headerBarSizeDesktop = '60px'

export function Header(props: {
    hamburgerOpen: boolean
    setHamburgerOpen: (newValue: boolean) => void
    hasUniverseSelector: boolean
    allUniverses: readonly string[]
    hasScreenshot: boolean
    initiateScreenshot: (currentUniverse: string | undefined) => void
}): ReactNode {
    const navContext = useContext(Navigator.Context)
    const currentUniverse = navContext.useUniverse()
    return (
        <div className="top_panel">
            <TopLeft
                hamburgerOpen={props.hamburgerOpen}
                setHamburgerOpen={props.setHamburgerOpen}
                hasUniverseSelector={props.hasUniverseSelector}
                allUniverses={props.allUniverses}
            />
            <div className="right_panel_top" style={{ height: `${headerBarSize}px` }}>
                {/* flex but stretch to fill */}
                <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
                    {!useMobileLayout() && props.hasUniverseSelector
                        ? (
                                <div style={{ paddingRight: '0.5em' }}>
                                    <UniverseSelector
                                        allUniverses={props.allUniverses}
                                    />
                                </div>
                            )
                        : undefined}
                    {
                        props.hasScreenshot
                            ? (
                                    <ScreenshotButton
                                        onClick={() => { props.initiateScreenshot(currentUniverse) }}
                                    />
                                )
                            : undefined
                    }
                    <div className="hgap"></div>
                    <div style={{ flexGrow: 1 }}>
                        <SearchBox
                            onChange={
                                (newLocation) => {
                                    void navContext.navigate({
                                        kind: 'article',
                                        universe: currentUniverse,
                                        longname: newLocation,
                                    }, 'push')
                                }
                            }
                            placeholder="Search Urban Stats"
                            style={{
                                fontSize: '30px',
                                paddingLeft: '1em',
                                width: '100%',
                                verticalAlign: 'middle',
                                height: `${headerBarSize}px`,
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
    hamburgerOpen: boolean
    setHamburgerOpen: (newValue: boolean) => void
    hasUniverseSelector: boolean
    allUniverses: readonly string[]
}): ReactNode {
    if (useMobileLayout()) {
        return (
            <div className="left_panel_top" style={{ minWidth: '28%' }}>
                <Nav hamburgerOpen={props.hamburgerOpen} setHamburgerOpen={props.setHamburgerOpen} />
                <div className="hgap"></div>
                {
                    props.hasUniverseSelector
                        ? (
                                <UniverseSelector
                                    allUniverses={props.allUniverses}
                                />
                            )
                        : <HeaderImage />
                }
            </div>
        )
    }
    else {
        return (
            <div className="left_panel_top" style={{ minWidth: '20%' }}>
                <HeaderImage />
            </div>
        )
    }
}

function HeaderImage(): ReactNode {
    const colors = useColors()
    const path = useMobileLayout() ? '/thumbnail.png' : colors.bannerURL
    const navContext = useContext(Navigator.Context)
    return (
        <a
            {...navContext.link({ kind: 'index' })}
        >
            <img
                src={path}
                style={{
                    height: useMobileLayout() ? `${headerBarSize}px` : headerBarSizeDesktop,
                }}
                alt="Urban Stats Logo"
            />
        </a>
    )
}

function UniverseSelector(
    { allUniverses }: { allUniverses: readonly string[] },
): ReactNode {
    const currentUniverse = useUniverse()
    // button to select universe. Image is icons/flags/${universe}.png
    // when clicked, a dropdown appears with all universes, labeled by their flags

    const width = headerBarSize * flagIconWidthRatio

    const [dropdownOpen, setDropdownOpen] = React.useState(false)

    let dropdown = dropdownOpen
        ? (
                <UniverseDropdown
                    flagSize={headerBarSize}
                    allUniverses={allUniverses}
                    closeDropdown={() => { setDropdownOpen(false) }}
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
            display: dropdownOpen ? 'block' : 'none',
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
                    height: `${headerBarSize}px`,
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                }
            }
            >
                <Flag
                    height={headerBarSize}
                    onClick={() => { setDropdownOpen(!dropdownOpen) }}
                    universe={currentUniverse}
                    classNameToUse="universe-selector"
                />
            </div>
            {dropdown}
        </div>
    )
}

function Flag(props: { height: number, onClick?: () => void, universe: string, classNameToUse: string }): ReactNode {
    const imageAR = flag_dimensions[props.universe]
    const usableHeight = props.height * flagIconMaxHeightPercent
    const usableWidth = Math.min(usableHeight * imageAR, props.height * flagIconWidthRatio)

    return (
        <div style={{ width: props.height * flagIconWidthRatio, height: props.height, display: 'flex' }}>
            <img
                style={{
                    margin: 'auto',
                }}
                src={universePath(props.universe)}
                alt={props.universe}
                width={`${usableWidth}px`}
                className={props.classNameToUse}
                onClick={props.onClick}
            />
        </div>
    )
}

function UniverseDropdown(
    { allUniverses, flagSize, closeDropdown }: { allUniverses: readonly string[], flagSize: number, closeDropdown: () => void },
): ReactNode {
    const colors = useColors()
    const navContext = useContext(Navigator.Context)
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
            {allUniverses.map((altUniverse) => {
                return (
                    <div
                        key={altUniverse}
                        onClick={() => {
                            navContext.setUniverse(altUniverse)
                            closeDropdown()
                        }}
                    >
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
                                height={flagSize}
                                universe={altUniverse}
                                classNameToUse="universe-selector-option"
                            />
                            <div className="serif">
                                {altUniverse === 'world' ? 'World' : altUniverse}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
