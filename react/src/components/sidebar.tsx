import React, { ReactNode, useContext, useEffect, useId, useRef } from 'react'

import '../style.css'
import './sidebar.css'
import { Settings, SettingsDictionary, statisticCategoryTree, tableCheckboxKeys, useSetting } from '../page_template/settings'
import { useMobileLayout } from '../utils/responsive'

export function Sidebar(): ReactNode {
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
                    <StatisticCategoryTree />
                </ul>
            </div>
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

export function CheckboxSettingCustom(props: { name: string, checked: boolean, indeterminate?: boolean, onChange: (checked: boolean) => void, classNameToUse?: string, id?: string }): ReactNode {
    // like CheckboxSetting, but doesn't use useSetting, instead using the callbacks
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
                style={{ accentColor: '#5a7dc3' }}
                ref={checkboxRef}
            />
            <label htmlFor={inputId}>{props.name}</label>
        </div>
    )
};

function StatisticCategoryTree(): ReactNode {
    return statisticCategoryTree.filter(node => node.category.show_checkbox).map(node => <StatisticCategoryTreeCategory key={node.category.key} node={node} />)
}

function StatisticCategoryTreeCategory({ node: { category, statistics } }: { node: typeof statisticCategoryTree[number] }): ReactNode {
    const settings = useContext(Settings.Context)
    const statisticSettings = Object.entries(settings.useSettings(tableCheckboxKeys(statistics)))
    const totalStatistics = statisticSettings.length
    const totalCheckedStatistics = statisticSettings.filter(([, checked]) => checked).length

    const [categoryStatus, setCategoryStatus] = useSetting(`show_category_statistic_${category.key}`)

    return (
        <li>
            <CheckboxSettingCustom
                name={category.name}
                checked={categoryStatus === true}
                indeterminate={categoryStatus === 'indeterminate'}
                onChange={() => {
                    switch (categoryStatus) {
                        case 'indeterminate':
                            setCategoryStatus(true)
                            break
                        case true:
                            setCategoryStatus(false)
                            break
                        case false:
                            setCategoryStatus('indeterminate')
                    }
                }}
            />
            <ul>
                {
                    statistics.map(statistic => <StatisticCategoryTreeStatistic key={statistic.key} statistic={statistic} />)
                }
            </ul>
        </li>
    )
}

function StatisticCategoryTreeStatistic({ statistic }: { statistic: typeof statisticCategoryTree[number]['statistics'][number] }): ReactNode {
    const [checked, setChecked] = useSetting(`show_statistic_${statistic.key}`)
    return (
        <li>
            <CheckboxSettingCustom
                name={statistic.name}
                checked={checked}
                onChange={setChecked}
            />
        </li>
    )
}
