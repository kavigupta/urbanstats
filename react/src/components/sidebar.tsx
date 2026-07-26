import React, { CSSProperties, ReactNode, useContext, useEffect, useId, useRef } from 'react'

import '../style.css'
import './sidebar.css'

import { Navigator } from '../navigation/Navigator'
import { Theme } from '../page_template/color-themes'
import { useColors, useCurrentTheme } from '../page_template/colors'
import { isStagedChange, SettingsDictionary, TemperatureUnit, useSetting, useSettingInfo } from '../page_template/settings'
import { humanReadableUniverse, useUniverse } from '../universe'
import { useMobileLayout } from '../utils/responsive'

function useSidebarSectionContentClassName(): string {
    let sidebarSectionContent = 'sidebar-section-content'
    if (useMobileLayout()) {
        sidebarSectionContent += ' sidebar-section-content_mobile'
    }
    return sidebarSectionContent
}

function useSidebarSectionTitleStyle(): CSSProperties {
    const colors = useColors()
    return {
        marginBottom: useMobileLayout() ? '0.75rem' : '0.5rem',
        borderBottom: `1px solid ${colors.borderNonShadow}`,
        color: colors.ordinalTextColor,
    }
}

function useSidebarFontSize(): string {
    return useMobileLayout() ? '27px' : '16px'
}

export function Sidebar({ onNavigate }: { onNavigate: () => void }): ReactNode {
    const colors = useColors()
    const currentTheme = useCurrentTheme()
    const linkStyle = { color: colors.blueLink }
    const sidebarSectionTitle = useSidebarSectionTitleStyle()

    const sidebarSectionContent = useSidebarSectionContentClassName()

    const navContext = useContext(Navigator.Context)
    const currentUniverse = useUniverse()
    const filterUniverse = useSetting('randomFilterByCurrentUniverse')[0] && currentUniverse !== undefined ? currentUniverse : undefined

    const fontSize = useSidebarFontSize()

    return (
        <div
            className={`serif ${useMobileLayout() ? 'sidebar_mobile' : ''}`}
            style={{
                backgroundColor: colors.slightlyDifferentBackground,
                padding: '2rem',
                fontSize,
                borderRadius: '5px',
            }}
        >
            <div className="sidebar-section">
                <div style={sidebarSectionTitle}>Main Menu</div>
                <ul className={sidebarSectionContent}>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'index' }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>Home</a>
                    </li>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'about' }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>About Urban Stats</a>
                    </li>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'dataCredit', hash: '' }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>Data Credit</a>
                    </li>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'ussDocumentation' }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>USS Documentation</a>
                    </li>
                </ul>
            </div>
            <div className="sidebar-section">
                <div style={sidebarSectionTitle}>Tools</div>
                <ul className={sidebarSectionContent}>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'mapper', view: false }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>Mapper</a>
                    </li>
                    <li>
                        <a
                            style={linkStyle}
                            // eslint-disable-next-line no-restricted-syntax -- to get the redirect behavior for free
                            href="/statistic.html"
                        >
                            Custom Table
                        </a>
                    </li>
                </ul>
            </div>
            <div className="sidebar-section">
                <div style={sidebarSectionTitle}>Random</div>
                <ul className={sidebarSectionContent}>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'random', sampleby: 'uniform', universe: filterUniverse }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>Unweighted</a>
                    </li>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'random', sampleby: 'population', universe: filterUniverse }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>Weighted by Population</a>
                    </li>
                    <li>
                        <CheckboxSetting
                            settingKey="randomFilterByCurrentUniverse"
                            fontSize={fontSize}
                            name={`Filter to universe (${humanReadableUniverse(currentUniverse ?? 'world')})`}
                        />
                    </li>
                </ul>
            </div>
            <div className="sidebar-section">
                <div style={sidebarSectionTitle}>Games</div>
                <ul className={sidebarSectionContent}>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'quiz' }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>Juxtastat</a>
                    </li>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'quiz', mode: 'retro' }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>Retrostat</a>
                    </li>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'quiz', mode: 'infinite' }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>Juxtastat Infinite</a>
                    </li>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'syau' }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>So you&apos;re an urbanist?</a>
                    </li>
                </ul>
            </div>
            <SettingsSidebarSection />
            <div className="sidebar-section">
                <div style={sidebarSectionTitle}>Appearance</div>
                <ul className={sidebarSectionContent}>
                    <li>
                        <ColorThemeSetting />
                    </li>
                    <li>
                        <CheckboxSetting
                            name="Colorblind Mode"
                            settingKey="colorblind_mode"
                            fontSize={fontSize}
                        />
                    </li>
                    <li>
                        <CheckboxSetting
                            // eslint-disable-next-line no-restricted-syntax -- these aren't colors, they're just names and also they're part of the settings
                            name={`${currentTheme === 'Dark Mode' ? 'Black' : 'White'} Background`}
                            settingKey="clean_background"
                            fontSize={fontSize}
                        />
                    </li>
                </ul>
            </div>
        </div>
    )
}

function SettingsSidebarSection(): ReactNode {
    const sidebarSectionTitle = useSidebarSectionTitleStyle()
    const sidebarSectionContent = useSidebarSectionContentClassName()
    const fontSize = useSidebarFontSize()

    return (
        <div className="sidebar-section">
            <div style={sidebarSectionTitle}>Settings</div>
            <ul className={sidebarSectionContent}>
                <li>
                    <CheckboxSetting
                        name="Use Imperial Units"
                        settingKey="use_imperial"
                        testId="use_imperial"
                        fontSize={fontSize}
                    />
                </li>
                <li>
                    <CheckboxSetting
                        name="Include Historical Districts"
                        settingKey="show_historical_cds"
                        fontSize={fontSize}
                    />
                </li>
                <li>
                    <CheckboxSetting
                        name="Include Person Circles"
                        settingKey="show_person_circles"
                        fontSize={fontSize}
                    />
                </li>
                <li>
                    <CheckboxSetting
                        name="Simple Ordinals"
                        settingKey="simple_ordinals"
                        fontSize={fontSize}
                    />
                </li>
                <li>
                    <TemperatureSetting />
                </li>
            </ul>
        </div>
    )
}

// type representing a key of SettingsDictionary that have boolean values
export type BooleanSettingKey = keyof { [K in keyof SettingsDictionary as SettingsDictionary[K] extends boolean | undefined ? K : never]: boolean }

export function CheckboxSetting(props: { name: string, settingKey: BooleanSettingKey, classNameToUse?: string, id?: string, testId?: string, forcedOn?: boolean, fontSize?: string }): ReactNode {
    const [checked, setChecked] = useSetting(props.settingKey)
    const info = useSettingInfo(props.settingKey)

    return (
        <CheckboxSettingCustom
            name={props.name}
            checked={(checked ?? false) || (props.forcedOn ?? false)}
            forcedOn={props.forcedOn}
            onChange={setChecked}
            classNameToUse={props.classNameToUse}
            id={props.id}
            testId={props.testId}
            highlight={isStagedChange(info)}
            fontSize={props.fontSize}
        />
    )
};

// represents the color theme setting, which sets it to either 'light' or 'dark'
function ColorThemeSetting(): ReactNode {
    const [theme, setTheme] = useSetting('theme')
    const colors = useColors()

    return (
        <div className="theme-setting">
            <label style={{ verticalAlign: 'middle' }}>{'Theme '}</label>
            <select
                className="serif"
                style={{ backgroundColor: colors.background, color: colors.textMain, verticalAlign: 'middle' }}
                value={theme}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setTheme(e.target.value as Theme) }}
            >
                <option value="System Theme">System Theme</option>
                <option value="Light Mode">Light Mode</option>
                <option value="Dark Mode">Dark Mode</option>
            </select>
        </div>
    )
};

function TemperatureSetting(): ReactNode {
    const [temperatureUnit, setTemperatureUnit] = useSetting('temperature_unit')
    const info = useSettingInfo('temperature_unit')
    const colors = useColors()

    const divStyle: CSSProperties = {
        ...useHighlightStyle(isStagedChange(info)),
        padding: '0px 5px',
    }

    return (
        <div style={divStyle}>
            <label style={{ verticalAlign: 'middle', fontSize: useSidebarFontSize() }}>{'Temperatures '}</label>
            <select
                className="serif"
                style={{ backgroundColor: colors.background, color: colors.textMain, verticalAlign: 'middle', minWidth: '50px' }}
                value={temperatureUnit}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setTemperatureUnit(e.target.value as TemperatureUnit) }}
                data-test-id="temperature_select"
            >
                <option value="fahrenheit">&deg;F</option>
                <option value="celsius">&deg;C</option>
            </select>
        </div>
    )
};

interface CheckboxSettingCustomJustInputProps {
    checked: boolean
    onChange: (checked: boolean) => void
    indeterminate?: boolean
    id?: string
    testId?: string
    highlight?: boolean
    forcedOn?: boolean
    style?: CSSProperties
    fontSize?: string
}

const defaultFontSize = '16px'

type CheckboxSettingCustomProps = CheckboxSettingCustomJustInputProps & {
    name: string
    classNameToUse?: string
}

/** Marks a control whose value staging is currently changing. */
export function useHighlightStyle(highlight: boolean | undefined): CSSProperties {
    const colors = useColors()
    return {
        backgroundColor: highlight === true ? colors.slightlyDifferentBackgroundFocused : undefined,
        borderRadius: '5px',
    }
}

export function CheckboxSettingCustom(props: CheckboxSettingCustomProps): ReactNode {
    const divStyle: CSSProperties = {
        ...useHighlightStyle(props.highlight),
        display: 'flex',
        alignItems: 'top',
        ...props.style,
    }
    const id = useId()
    const inputId = props.id ?? id

    return (
        <div className={(props.classNameToUse ?? 'checkbox-setting') + (props.forcedOn ? ' testing-checkbox-disabled' : '')} style={divStyle}>
            <CheckboxSettingJustBox
                {...props}
                id={inputId}
                style={{ ...props.style }}
            />
            <label htmlFor={inputId} style={{ fontSize: props.fontSize ?? defaultFontSize }}>{props.name}</label>
        </div>
    )
};

export function CheckboxSettingJustBox(props: CheckboxSettingCustomJustInputProps): ReactNode {
    const colors = useColors()
    const id = useId()
    const checkboxRef = useRef<HTMLInputElement>(null)
    const inputId = props.id ?? id
    const forcedOn = props.forcedOn ?? false

    useEffect(() => {
        checkboxRef.current!.indeterminate = props.indeterminate ?? false
    }, [props.indeterminate])

    return (
        <input
            id={inputId}
            type="checkbox"
            checked={props.checked}
            disabled={forcedOn}
            onChange={(e) => { props.onChange(e.target.checked) }}
            ref={checkboxRef}
            style={{ accentColor: colors.hueColors.blue, backgroundColor: colors.background, height: props.fontSize ?? defaultFontSize, ...props.style }}
            data-test-id={props.testId}
            data-test-highlight={props.highlight}
        />
    )
}
