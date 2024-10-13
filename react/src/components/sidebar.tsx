import React, { ReactNode, useId } from 'react'

import '../style.css'
import './sidebar.css'
import { SettingsDictionary, Theme, useColors, useSetting, useStatisticCategoryMetadataCheckboxes } from '../page_template/settings'
import { useMobileLayout } from '../utils/responsive'

export function Sidebar(): ReactNode {
    const statistic_category_metadata_checkboxes = useStatisticCategoryMetadataCheckboxes()
    let sidebar_section_content = 'sidebar-section-content'
    let sidebar_section_title = 'sidebar-section-title'
    if (useMobileLayout()) {
        sidebar_section_content += ' sidebar-section-content_mobile'
        sidebar_section_title += ' sidebar-section-title_mobile'
    }
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
                    {statistic_category_metadata_checkboxes.map((checkbox, i) => (
                        <li key={i}>
                            <CheckboxSetting
                                name={checkbox.name}
                                setting_key={checkbox.setting_key}
                            />
                        </li>
                    ),
                    )}
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

export function CheckboxSetting<K extends BooleanSettingKey>(props: { name: string, setting_key: K, classNameToUse?: string, id?: string }): ReactNode {
    const [checked, setChecked] = useSetting(props.setting_key)

    return (
        <CheckboxSettingCustom
            name={props.name}
            setting_key={props.setting_key}
            settings={{ [props.setting_key]: checked } as Record<K, boolean>}
            set_setting={(key, value) => {
                if (key === props.setting_key) {
                    setChecked(value)
                }
                else {
                    throw new Error(`Invalid key: ${key}`)
                }
            }}
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

export function CheckboxSettingCustom<K extends string>(props: { name: string, setting_key: K, settings: Record<K, boolean>, set_setting: (key: K, value: boolean) => void, classNameToUse?: string, id?: string }): ReactNode {
    const colors = useColors()
    // like CheckboxSetting, but doesn't use useSetting, instead using the callbacks
    const id = useId()
    const inputId = props.id ?? id
    return (
        <div className={props.classNameToUse ?? 'checkbox-setting'}>
            <input
                id={inputId}
                type="checkbox"
                checked={props.settings[props.setting_key] || false}
                onChange={(e) => { props.set_setting(props.setting_key, e.target.checked) }}
                style={{ accentColor: '#5a7dc3', backgroundColor: colors.background }}
            />
            <label htmlFor={inputId}>{props.name}</label>
        </div>
    )
};
