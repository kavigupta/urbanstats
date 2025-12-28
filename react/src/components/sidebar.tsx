import React, { CSSProperties, ReactNode, useContext, useEffect, useId, useRef } from 'react'

import '../style.css'
import './sidebar.css'

import { Navigator } from '../navigation/Navigator'
import { Theme } from '../page_template/color-themes'
import { useColors, useCurrentTheme } from '../page_template/colors'
import { checkboxCategoryName, SettingsDictionary, sourceEnabledKey, TemperatureUnit, useSetting, useSettingInfo, useStagedSettingKeys } from '../page_template/settings'
import { useDataSourceCheckboxes } from '../page_template/statistic-settings'
import { useMobileLayout } from '../utils/responsive'

import { StagingControls } from './StagingControls'
import { StatsTree } from './StatsTree'
import { Years } from './Years'

export function useSidebarSectionContentClassName(): string {
    let sidebarSectionContent = 'sidebar-section-content'
    if (useMobileLayout()) {
        sidebarSectionContent += ' sidebar-section-content_mobile'
    }
    return sidebarSectionContent
}

export function useSidebarSectionTitleStyle(): CSSProperties {
    const colors = useColors()
    return {
        marginBottom: useMobileLayout() ? '0.75rem' : '0.5rem',
        borderBottom: `1px solid ${colors.borderNonShadow}`,
        color: colors.ordinalTextColor,
    }
}

export function useSidebarFontSize(): string {
    return useMobileLayout() ? '27px' : '16px'
}

export function Sidebar({ onNavigate }: { onNavigate: () => void }): ReactNode {
    const colors = useColors()
    const currentTheme = useCurrentTheme()
    const linkStyle = { color: colors.blueLink }
    const sidebarSectionTitle = useSidebarSectionTitleStyle()

    const sidebarSectionContent = useSidebarSectionContentClassName()

    const navContext = useContext(Navigator.Context)

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
                        <a style={linkStyle} {...navContext.link({ kind: 'ussDocumentation', hash: '' }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>USS Documentation</a>
                    </li>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'mapper', view: false }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>Mapper</a>
                    </li>
                    <li>
                        <a
                            style={linkStyle}
                            {...navContext.link(
                                {
                                    kind: 'statistic',
                                    article_type: 'Subnational Region',
                                    uss: 'customNode(""); condition (true); table(columns=[column(values=density_pw_1km)])',
                                    start: 1,
                                    amount: 20,
                                    order: 'descending',
                                    universe: 'USA',
                                    edit: true,
                                    sort_column: 0,
                                },
                                { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}
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
                        <a style={linkStyle} {...navContext.link({ kind: 'random', sampleby: 'uniform', us_only: false }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>Unweighted</a>
                    </li>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'random', sampleby: 'population', us_only: false }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>Weighted by Population</a>
                    </li>
                    <li>
                        <a style={linkStyle} {...navContext.link({ kind: 'random', sampleby: 'population', us_only: true }, { scroll: { kind: 'position', top: 0 }, postNavigationCallback: onNavigate })}>Weighted by Population (US only)</a>
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
            <MaybeStagingControlsSidebarSection />
            <SettingsSidebarSection />
            { navContext.useStatPathsAll() !== undefined
                ? <SidebarForStatisticChoice />
                : null}
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

export function MaybeStagingControlsSidebarSection(): ReactNode {
    const sidebarSectionTitle = useSidebarSectionTitleStyle()
    const sidebarSectionContent = useSidebarSectionContentClassName()

    return (
        useStagedSettingKeys() === undefined
            ? null
            : (
                    <div className="sidebar-section">
                        <div style={sidebarSectionTitle}>Link Settings</div>
                        <ul className={sidebarSectionContent}>
                            <StagingControls />
                        </ul>
                    </div>
                )
    )
}

export function SettingsSidebarSection(): ReactNode {
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

export function SidebarForStatisticChoice(): ReactNode {
    const sidebarSectionContent = useSidebarSectionContentClassName()
    const sidebarSectionTitle = useSidebarSectionTitleStyle()
    const checkboxes = useDataSourceCheckboxes()
    const fontSize = useSidebarFontSize()
    return (
        <>
            {checkboxes.map(({ category, checkboxSpecs }) => (
                <div className="sidebar-section" key={category}>
                    <div style={sidebarSectionTitle}>{checkboxCategoryName(category)}</div>
                    <ul className={sidebarSectionContent}>
                        {
                            checkboxSpecs.map(({ name, forcedOn }) => (
                                <li key={name}>
                                    <CheckboxSetting
                                        name={name}
                                        settingKey={sourceEnabledKey({ category, name })}
                                        forcedOn={forcedOn}
                                        testId={`source ${category} ${name}`}
                                        fontSize={fontSize}
                                    />
                                </li>
                            ))
                        }
                    </ul>
                </div>
            ))}
            <div className="sidebar-section">
                <div style={sidebarSectionTitle}>Years</div>
                <ul className={sidebarSectionContent}>
                    <Years />
                </ul>
            </div>
            <div className="sidebar-section">
                <div style={sidebarSectionTitle}>Statistic Categories</div>
                <ul className={sidebarSectionContent}>
                    <StatsTree />
                </ul>
            </div>
        </>
    )
}

// type representing a key of SettingsDictionary that have boolean values
type BooleanSettingKey = keyof { [K in keyof SettingsDictionary as SettingsDictionary[K] extends boolean | undefined ? K : never]: boolean }

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
            highlight={'stagedValue' in info && info.stagedValue !== info.persistedValue}
            fontSize={props.fontSize}
        />
    )
};

// represents the color theme setting, which sets it to either 'light' or 'dark'
export function ColorThemeSetting(): ReactNode {
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

export function TemperatureSetting(): ReactNode {
    const [temperatureUnit, setTemperatureUnit] = useSetting('temperature_unit')
    const info = useSettingInfo('temperature_unit')
    const colors = useColors()

    const highlight = 'stagedValue' in info && info.stagedValue !== info.persistedValue

    const divStyle: CSSProperties = {
        backgroundColor: highlight ? colors.slightlyDifferentBackgroundFocused : undefined,
        borderRadius: '5px',
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

export function CheckboxSettingCustom(props: CheckboxSettingCustomProps): ReactNode {
    const colors = useColors()

    const divStyle: CSSProperties = {
        backgroundColor: props.highlight ? colors.slightlyDifferentBackgroundFocused : undefined,
        borderRadius: '5px',
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
            style={{ accentColor: colors.hueColors.blue, backgroundColor: colors.background, ...props.style, height: props.fontSize ?? defaultFontSize }}
            data-test-id={props.testId}
            data-test-highlight={props.highlight}
        />
    )
}
