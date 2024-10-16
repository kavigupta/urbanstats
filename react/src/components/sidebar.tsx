import React, { ReactNode, useEffect, useId, useRef } from 'react'

import '../style.css'
import './sidebar.css'

import { Theme, useColors } from '../page_template/colors'
import { SettingsDictionary, useSetting } from '../page_template/settings'
import { useMobileLayout } from '../utils/responsive'

import { StatsTree } from './StatsTree'

export function useSidebarClasses(): { sidebar_section_content: string, sidebar_section_title: string } {
    let sidebar_section_content = 'sidebar-section-content'
    let sidebar_section_title = 'sidebar-section-title'
    if (useMobileLayout()) {
        sidebar_section_content += ' sidebar-section-content_mobile'
        sidebar_section_title += ' sidebar-section-title_mobile'
    }
    return { sidebar_section_content, sidebar_section_title }
}

export function Sidebar(): ReactNode {
    const { sidebar_section_content, sidebar_section_title } = useSidebarClasses()
    return (
        <div className={`serif sidebar${useMobileLayout() ? '_mobile' : ''}`}>
            <div className="sidebar-section">
                <div className={sidebar_section_title}>Main Menu</div>
                <ul className={sidebar_section_content}>
                    <li>
                        <a href="/">Home</a>
                    </li>
                    <li>
                        <a href="/about.html">About Urban Stats</a>
                    </li>
                    <li>
                        <a href="/data-credit.html">Data Credit</a>
                    </li>
                    <li>
                        <a href="/mapper.html">Mapper (beta)</a>
                    </li>
                </ul>
            </div>
            <div className="sidebar-section">
                <div className={sidebar_section_title}>Random</div>
                <ul className={sidebar_section_content}>
                    <li>
                        <a href="/random.html">Unweighted</a>
                    </li>
                    <li>
                        <a href="/random.html?sampleby=population&us_only=false">Weighted by Population</a>
                    </li>
                    <li>
                        <a href="/random.html?sampleby=population&us_only=true">Weighted by Population (US only)</a>
                    </li>
                </ul>
            </div>
            <div className="sidebar-section">
                <div className={sidebar_section_title}>Games</div>
                <ul className={sidebar_section_content}>
                    <li>
                        <a href="/quiz.html">Juxtastat</a>
                    </li>
                    <li>
                        <a href="/quiz.html?mode=retro">Retrostat</a>
                    </li>
                </ul>
            </div>
            <div className="sidebar-section">
                <div className={sidebar_section_title}>Settings</div>
                <ul className={sidebar_section_content}>
                    <li>
                        <CheckboxSetting
                            name="Use Imperial Units"
                            setting_key="use_imperial"
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
            <div className="sidebar-section">
                <div className={sidebar_section_title}>Statistic Categories</div>
                <ul className={sidebar_section_content}>
                    <StatsTree />
                </ul>
            </div>
            {/* <div className="sidebar-section">
                <div className={sidebar_section_title}>Appearance</div>
                <ul className={sidebar_section_content}>
                    <li>
                        <ColorThemeSetting />
                    </li>
                </ul>
            </div> */}
        </div>
    )
}

// type representing a key of SettingsDictionary that have boolean values
type BooleanSettingKey = keyof { [K in keyof SettingsDictionary as SettingsDictionary[K] extends boolean ? K : never]: boolean }

export function CheckboxSetting(props: { name: string, setting_key: BooleanSettingKey, classNameToUse?: string, id?: string }): ReactNode {
    const [checked, setChecked] = useSetting(props.setting_key)

    return (
        <CheckboxSettingCustom
            name={props.name}
            checked={checked}
            onChange={setChecked}
            classNameToUse={props.classNameToUse}
            id={props.id}
        />
    )
};

// represents the color theme setting, which sets it to either 'light' or 'dark'
export function ColorThemeSetting(): ReactNode {
    const [theme, setTheme] = useSetting('theme')
    const colors = useColors()

    return (
        <div className="theme-setting">
            <label>{'Theme '}</label>
            <select
                className="serif"
                style={{ backgroundColor: colors.background }}
                value={theme}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setTheme(e.target.value as Theme) }}
            >
                <option value="Light Mode">Light Mode</option>
                <option value="Dark Mode">Dark Mode</option>
            </select>
        </div>
    )
};

export function CheckboxSettingCustom(props: { name: string, checked: boolean, indeterminate?: boolean, onChange: (checked: boolean) => void, classNameToUse?: string, id?: string }): ReactNode {
    const colors = useColors()

    const id = useId()
    const inputId = props.id ?? id

    const checkboxRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        checkboxRef.current!.indeterminate = props.indeterminate ?? false
    }, [props.indeterminate])

    return (
        <div className={props.classNameToUse ?? 'checkbox-setting'}>
            <input
                id={inputId}
                type="checkbox"
                checked={props.checked}
                onChange={(e) => { props.onChange(e.target.checked) }}
                ref={checkboxRef}
                style={{ accentColor: colors.hueColors.blue, backgroundColor: colors.background }}
            />
            <label htmlFor={inputId}>{props.name}</label>
        </div>
    )
};
