import React, { CSSProperties, ReactNode, useContext, useEffect, useId, useRef } from 'react'

import '../style.css'
import './sidebar.css'

import { Theme, useColors, useCurrentTheme } from '../page_template/colors'
import { checkbox_category_name, SettingsDictionary, source_enabled_key, useSetting, useSettingInfo, useStagedSettingKeys } from '../page_template/settings'
import { StatPathsContext, useDataSourceCheckboxes } from '../page_template/statistic-settings'
import { useMobileLayout } from '../utils/responsive'

import { StagingControls } from './StagingControls'
import { StatsTree } from './StatsTree'
import { Years } from './Years'

export function useSidebarSectionContentClassName(): string {
    let sidebar_section_content = 'sidebar-section-content'
    if (useMobileLayout()) {
        sidebar_section_content += ' sidebar-section-content_mobile'
    }
    return sidebar_section_content
}

export function useSidebarSectionTitleStyle(): CSSProperties {
    const colors = useColors()
    return {
        marginBottom: useMobileLayout() ? '0.75rem' : '0.5rem',
        borderBottom: `1px solid ${colors.borderNonShadow}`,
        color: colors.ordinalTextColor,
    }
}

export function Sidebar(): ReactNode {
    const colors = useColors()
    const currentTheme = useCurrentTheme()
    const link_style = { color: colors.blueLink }
    const sidebar_section_title = useSidebarSectionTitleStyle()

    const sidebar_section_content = useSidebarSectionContentClassName()

    return (
        <div
            className={`serif ${useMobileLayout() ? 'sidebar_mobile' : ''}`}
            style={{
                backgroundColor: colors.slightlyDifferentBackground,
                padding: '2rem',
                fontSize: useMobileLayout() ? '27px' : '16px',
                borderRadius: '5px',
            }}
        >
            <div className="sidebar-section">
                <div style={sidebar_section_title}>Main Menu</div>
                <ul className={sidebar_section_content}>
                    <li>
                        <a style={link_style} href="/">Home</a>
                    </li>
                    <li>
                        <a style={link_style} href="/about.html">About Urban Stats</a>
                    </li>
                    <li>
                        <a style={link_style} href="/data-credit.html">Data Credit</a>
                    </li>
                    <li>
                        <a style={link_style} href="/mapper.html">Mapper (beta)</a>
                    </li>
                </ul>
            </div>
            <div className="sidebar-section">
                <div style={sidebar_section_title}>Random</div>
                <ul className={sidebar_section_content}>
                    <li>
                        <a style={link_style} href="/random.html">Unweighted</a>
                    </li>
                    <li>
                        <a style={link_style} href="/random.html?sampleby=population&us_only=false">Weighted by Population</a>
                    </li>
                    <li>
                        <a style={link_style} href="/random.html?sampleby=population&us_only=true">Weighted by Population (US only)</a>
                    </li>
                </ul>
            </div>
            <div className="sidebar-section">
                <div style={sidebar_section_title}>Games</div>
                <ul className={sidebar_section_content}>
                    <li>
                        <a style={link_style} href="/quiz.html">Juxtastat</a>
                    </li>
                    <li>
                        <a style={link_style} href="/quiz.html?mode=retro">Retrostat</a>
                    </li>
                </ul>
            </div>
            {
                useStagedSettingKeys() === undefined
                    ? null
                    : (
                            <div className="sidebar-section">
                                <div style={sidebar_section_title}>Link Settings</div>
                                <ul className={sidebar_section_content}>
                                    <StagingControls />
                                </ul>
                            </div>
                        )
            }
            <div className="sidebar-section">
                <div style={sidebar_section_title}>Settings</div>
                <ul className={sidebar_section_content}>
                    <li>
                        <CheckboxSetting
                            name="Use Imperial Units"
                            setting_key="use_imperial"
                            testId="use_imperial"
                        />
                    </li>
                    <li>
                        <CheckboxSetting
                            name="Include Historical Districts"
                            setting_key="show_historical_cds"
                        />
                    </li>
                    <li>
                        <CheckboxSetting
                            name="Simple Ordinals"
                            setting_key="simple_ordinals"
                        />
                    </li>
                </ul>
            </div>
            { useContext(StatPathsContext) !== undefined
                ? <SidebarForStatisticChoice />
                : null}
            <div className="sidebar-section">
                <div style={sidebar_section_title}>Appearance</div>
                <ul className={sidebar_section_content}>
                    <li>
                        <ColorThemeSetting />
                    </li>
                    <li>
                        <CheckboxSetting
                            name="Colorblind Mode"
                            setting_key="colorblind_mode"
                        />
                    </li>
                    <li>
                        <CheckboxSetting
                            name={`${currentTheme === 'Dark Mode' ? 'Black' : 'White'} Background`}
                            setting_key="clean_background"
                        />
                    </li>
                </ul>
            </div>
        </div>
    )
}

export function SidebarForStatisticChoice(): ReactNode {
    const sidebar_section_content = useSidebarSectionContentClassName()
    const sidebar_section_title = useSidebarSectionTitleStyle()
    const checkboxes = useDataSourceCheckboxes()
    return (
        <>
            {checkboxes.map(({ category, checkboxSpecs }) => (
                <div className="sidebar-section" key={category}>
                    <div style={sidebar_section_title}>{checkbox_category_name(category)}</div>
                    <ul className={sidebar_section_content}>
                        {
                            checkboxSpecs.map(({ name, forcedOn }) => (
                                <li key={name}>
                                    <CheckboxSetting
                                        name={name}
                                        setting_key={source_enabled_key({ category, name })}
                                        forcedOn={forcedOn}
                                        testId={`source ${category} ${name}`}
                                    />
                                </li>
                            ))
                        }
                    </ul>
                </div>
            ))}
            <div className="sidebar-section">
                <div style={sidebar_section_title}>Years</div>
                <ul className={sidebar_section_content}>
                    <Years />
                </ul>
            </div>
            <div className="sidebar-section">
                <div style={sidebar_section_title}>Statistic Categories</div>
                <ul className={sidebar_section_content}>
                    <StatsTree />
                </ul>
            </div>
        </>
    )
}

// type representing a key of SettingsDictionary that have boolean values
type BooleanSettingKey = keyof { [K in keyof SettingsDictionary as SettingsDictionary[K] extends boolean | undefined ? K : never]: boolean }

export function CheckboxSetting(props: { name: string, setting_key: BooleanSettingKey, classNameToUse?: string, id?: string, testId?: string, forcedOn?: boolean }): ReactNode {
    const [checked, setChecked] = useSetting(props.setting_key)
    const info = useSettingInfo(props.setting_key)

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

interface CheckboxSettingCustomProps {
    name: string
    checked: boolean
    indeterminate?: boolean
    onChange: (checked: boolean) => void
    classNameToUse?: string
    id?: string
    testId?: string
    highlight?: boolean
    forcedOn?: boolean
}

export function CheckboxSettingCustom(props: CheckboxSettingCustomProps): ReactNode {
    const colors = useColors()

    const id = useId()
    const inputId = props.id ?? id

    const checkboxRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        checkboxRef.current!.indeterminate = props.indeterminate ?? false
    }, [props.indeterminate])

    const divStyle: CSSProperties = {
        backgroundColor: props.highlight ? colors.slightlyDifferentBackgroundFocused : undefined,
        borderRadius: '5px',
    }
    const forcedOn = props.forcedOn ?? false

    return (
        <div className={(props.classNameToUse ?? 'checkbox-setting') + (forcedOn ? ' testing-checkbox-disabled' : '')} style={divStyle}>
            <input
                id={inputId}
                type="checkbox"
                checked={props.checked}
                disabled={forcedOn}
                onChange={(e) => { props.onChange(e.target.checked) }}
                ref={checkboxRef}
                style={{ accentColor: colors.hueColors.blue, backgroundColor: colors.background }}
                data-test-id={props.testId}
                data-test-highlight={props.highlight}
            />
            <label htmlFor={inputId}>{props.name}</label>
        </div>
    )
};
