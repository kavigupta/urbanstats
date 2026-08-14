import React, { ReactNode, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'

import '../common.css'
import flag_dimensions from '../data/flag_dimensions'
import statistic_name_list from '../data/statistic_name_list'
import { Navigator } from '../navigation/Navigator'
import { universePath } from '../navigation/links'
import { useColors } from '../page_template/colors'
import { useHeaderLogoKey, useHideSidebarDesktop } from '../page_template/utils'
import { humanReadableUniverse, universeContext, useUniverse, useUniverseContext } from '../universe'
import { assert } from '../utils/defensive'
import { useMobileLayout } from '../utils/responsive'
import { zIndex } from '../utils/zIndex'

import { CSVButton } from './csv-export'
import { Nav } from './hamburger'
import { ScreenshotButton } from './screenshot'
import { SearchBox } from './search'

const headerBarSize = 48
const flagIconWidthRatio = 1.8
const flagIconMaxHeightPercent = 0.85
const headerBarSizeDesktop = '60px'

export function Header(props: {
    hamburgerOpen: boolean
    setHamburgerOpen: (newValue: boolean) => void
    hasScreenshot: boolean
    hasCSV: boolean
    initiateScreenshot: (currentUniverse: string | undefined) => void
    exportCSV: () => void
}): ReactNode {
    const navContext = useContext(Navigator.Context)
    const currentUniverse = useUniverse()
    const [searchHasText, setSearchHasText] = useState(false)
    const isMobile = useMobileLayout()
    return (
        <div className="top_panel">
            <TopLeft
                hamburgerOpen={props.hamburgerOpen}
                setHamburgerOpen={props.setHamburgerOpen}
            />
            <div className="right_panel_top" style={{ height: `${headerBarSize}px` }}>
                {/* flex but stretch to fill */}
                <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
                    {currentUniverse ? <UniverseSelector /> : undefined}
                    {
                        props.hasScreenshot
                            ? (
                                    <>
                                        <div className="hgap"></div>
                                        <ScreenshotButton
                                            onClick={() => { props.initiateScreenshot(currentUniverse) }}
                                        />
                                    </>
                                )
                            : undefined
                    }
                    {
                        props.hasCSV
                            ? (
                                    <>
                                        <div className="hgap"></div>
                                        <CSVButton
                                            onClick={() => { props.exportCSV() }}
                                        />
                                    </>
                                )
                            : undefined
                    }
                    <div className="hgap"></div>
                    <div style={{
                        flexGrow: 1,
                        ...(isMobile && searchHasText
                            ? {
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    top: 0,
                                    zIndex: zIndex.mobileSearch,
                                    backgroundColor: 'var(--background)',
                                    padding: '0 1em',
                                }
                            : {}),
                    }}
                    >
                        <SearchBox
                            articleLink={
                                newLocation => navContext.link({
                                    kind: 'article',
                                    universe: currentUniverse,
                                    longname: newLocation,
                                }, {
                                    scroll: { kind: 'position', top: 0 },
                                    postNavigationCallback: () => { props.setHamburgerOpen(false) },
                                })
                            }
                            statisticLink={(statisticIndex, articleType, universe) => {
                                const currentDescriptor = navContext.currentDescriptor
                                return navContext.link({
                                    kind: 'statistic',
                                    universe,
                                    statname: statistic_name_list[statisticIndex],
                                    article_type: articleType,
                                    start: 1,
                                    // Preserve the amount if we're already on a statistics page
                                    amount: currentDescriptor.kind === 'statistic'
                                        ? currentDescriptor.amount
                                        : 20,
                                    order: 'descending',
                                }, {
                                    scroll: { kind: 'position', top: 0 },
                                    postNavigationCallback: () => { props.setHamburgerOpen(false) },
                                })
                            }}
                            placeholder="Search Urban Stats"
                            style={{
                                fontSize: '30px',
                                paddingLeft: '1em',
                                width: '100%',
                                verticalAlign: 'middle',
                                height: `${headerBarSize}px`,
                            }}
                            autoFocus={false}
                            onTextPresenceChange={(hasText: boolean) => { setSearchHasText(hasText) }}
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
}): ReactNode {
    const hideSidebarDesktop = useHideSidebarDesktop()
    const universeCtx = useUniverseContext()
    if (useMobileLayout()) {
        return (
            <div className="left_panel_top">
                <Nav hamburgerOpen={props.hamburgerOpen} setHamburgerOpen={props.setHamburgerOpen} />
                <div className="hgap"></div>
                {universeCtx === undefined ? <HeaderImage /> : undefined}
            </div>
        )
    }
    else {
        return (
            <div className="left_panel_top" style={{ minWidth: '20%' }}>
                {hideSidebarDesktop && <Nav hamburgerOpen={props.hamburgerOpen} setHamburgerOpen={props.setHamburgerOpen} />}
                <HeaderImage />
            </div>
        )
    }
}

function HeaderImage(): ReactNode {
    const colors = useColors()
    const navContext = useContext(Navigator.Context)
    const bannerKey = useHeaderLogoKey()
    const path = useMobileLayout() ? '/thumbnail.png' : colors[bannerKey]
    return (
        <a
            {...navContext.link({ kind: 'index' }, { scroll: { kind: 'position', top: 0 } })}
            style={{
                display: 'flex',
            }}
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

const showSearchThreshold = 10

function UniverseSelector(): ReactNode {
    const universeCtx = useUniverseContext()
    assert(universeCtx !== undefined, 'No universe context')
    // button to select universe. Image is icons/flags/${universe}.png
    // when clicked, a dropdown appears with all universes, labeled by their flags

    const width = headerBarSize * flagIconWidthRatio

    const [dropdownOpen, setDropdownOpen] = React.useState(false)

    const divRef = useRef<HTMLDivElement>(null)

    // If the tree goes out of focus, close the dropdown
    useEffect(() => {
        const listener = (): void => {
            // Delay closing to allow focus again
            setTimeout(() => {
                if (!divRef.current?.contains(document.activeElement)) {
                    setDropdownOpen(false)
                }
            }, 150)
        }
        document.addEventListener('blur', listener, true)
        return () => {
            document.removeEventListener('blur', listener, true)
        }
    }, [])

    // We need to do some programmatic placement of the dropdown to prevent it from expanding the page on mobile
    const [dropdownPlacement, setDropdownPlacement] = useState<{ left: number, width: number }>()

    useLayoutEffect(() => {
        if (!dropdownOpen) {
            return
        }
        const place = (): void => {
            if (divRef.current === null) {
                return
            }
            const anchorLeft = divRef.current.getBoundingClientRect().left
            const margin = 5
            const viewportWidth = document.documentElement.clientWidth
            const dropdownWidth = Math.min(divRef.current.offsetWidth * 5, viewportWidth - 2 * margin)
            setDropdownPlacement({
                left: Math.max(margin - anchorLeft, Math.min(0, viewportWidth - margin - dropdownWidth - anchorLeft)),
                width: dropdownWidth,
            })
        }
        place()
        window.addEventListener('resize', place)
        return () => { window.removeEventListener('resize', place) }
    }, [dropdownOpen])

    let dropdown = dropdownOpen
        ? (
                <UniverseDropdown
                    flagSize={headerBarSize}
                    closeDropdown={() => { setDropdownOpen(false) }}
                />
            )
        : undefined

    const colors = useColors()

    dropdown = (
        <div style={{
            position: 'absolute',
            zIndex: zIndex.universeDropdown,
            borderRadius: '0.25em',
            display: dropdownOpen ? 'block' : 'none',
            left: dropdownPlacement?.left ?? 0,
            width: dropdownPlacement?.width ?? '500%',
            maxHeight: universeCtx.universes.length > showSearchThreshold ? '22em' : '20em',
            overflowY: 'auto',
            border: `1px solid ${colors.ordinalTextColor}`,
            backgroundColor: colors.slightlyDifferentBackground,
        }}
        >
            {dropdown}
        </div>
    )

    return (
        <div ref={divRef} style={{ marginBlockEnd: '0em', position: 'relative', width: `${width}px` }}>
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
                <SelectorFlag
                    height={headerBarSize}
                    onClick={() => { setDropdownOpen(!dropdownOpen) }}
                    universe={universeCtx.universe}
                />
            </div>
            {dropdown}
        </div>
    )
}

function SelectorFlag(props: { height: number, onClick: () => void, universe: string }): ReactNode {
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
                className="universe-selector"
                onClick={props.onClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        props.onClick()
                    }
                }}
            />
        </div>
    )
}

function DropdownFlag(props: { height: number, universe: string }): ReactNode {
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
                className="universe-selector-option"
            />
        </div>
    )
}

function UniverseDropdown(
    { flagSize, closeDropdown }: { flagSize: number, closeDropdown: () => void },
): ReactNode {
    const colors = useColors()
    const [searchTerm, setSearchTerm] = useState('')
    const universeCtx = useContext(universeContext)
    assert(universeCtx !== undefined, 'No universe context')
    const { universes, setUniverse } = universeCtx
    const filteredUniverses = universes.filter(universe => universe.toLowerCase().includes(searchTerm.toLowerCase()))

    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        searchInputRef.current?.focus()
    }, [])

    const [highlighted, setHighlighted] = useState(0)
    const highlightedRef = useRef<HTMLButtonElement>(null)
    const optionsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (optionsRef.current?.contains(document.activeElement) ?? false) {
            highlightedRef.current?.focus()
        }
        else {
            highlightedRef.current?.scrollIntoView({ block: 'nearest' })
        }
    }, [highlighted])

    useEffect(() => {
        const listener = (e: KeyboardEvent): void => {
            switch (e.key) {
                case 'ArrowDown':
                    setHighlighted(h => Math.max(0, Math.min(h + 1, filteredUniverses.length - 1)))
                    break
                case 'ArrowUp':
                    setHighlighted(h => Math.max(h - 1, 0))
                    break
                case 'Enter':
                    if (optionsRef.current?.contains(document.activeElement) ?? false) {
                        return // the focused option will be clicked
                    }
                    if (filteredUniverses.length > 0) {
                        setUniverse(filteredUniverses[highlighted])
                        closeDropdown()
                    }
                    break
                default:
                    return
            }
            e.preventDefault()
        }
        document.addEventListener('keydown', listener)
        return () => { document.removeEventListener('keydown', listener) }
    }, [filteredUniverses, highlighted, setUniverse, closeDropdown])

    return (
        <div>
            <div
                className="serif"
                style={{
                    fontWeight: 500,
                    backgroundColor: colors.slightlyDifferentBackground,
                    padding: '0.5em',
                }}
            >
                Select universe for statistics
            </div>
            {
                universes.length > showSearchThreshold
                    ? (
                            <div style={{
                                padding: '0 0.5em 0.5em 0.5em',
                                width: '100%',
                                backgroundColor: colors.slightlyDifferentBackground,
                            }}
                            >
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Search Universes"
                                    className="serif"
                                    style={{
                                        paddingLeft: '1.25em',
                                        fontSize: '16px',
                                        width: '100%',
                                    }}
                                    onFocus={e => setTimeout(() => {
                                        e.target.select()
                                    }, 0)}
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value)
                                        setHighlighted(0)
                                    }}
                                    data-test-id="universe-search"
                                >

                                </input>
                            </div>
                        )
                    : null
            }
            <div ref={optionsRef}>
                {filteredUniverses.map((altUniverse, index) => {
                    return (
                        <button
                            key={altUniverse}
                            ref={index === highlighted ? highlightedRef : null}
                            type="button"
                            className="borderless"
                            onClick={() => {
                                setUniverse(altUniverse)
                                closeDropdown()
                            }}
                            onFocus={() => { setHighlighted(index) }}
                            // mousemove rather than mouseenter: scrolling the list under a stationary
                            // cursor fires mouseenter, which would undo the arrow key that scrolled it
                            onMouseMove={() => { setHighlighted(index) }}
                            style={{
                                display: 'flex',
                                flexDirection: 'row',
                                gap: '1em',
                                alignItems: 'center',
                                cursor: 'pointer',
                                padding: '0.5em',
                                width: '100%',
                                fontSize: 'inherit',
                                borderRadius: 0,
                                // overrides the :hover rule, so hovering moves the highlight instead of adding a second one
                                backgroundColor: index === highlighted ? colors.slightlyDifferentBackgroundFocused : 'transparent',
                            }}
                        >
                            <DropdownFlag
                                height={flagSize}
                                universe={altUniverse}
                            />
                            <div className="serif">
                                {humanReadableUniverse(altUniverse)}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
