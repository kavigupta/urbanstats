import React, { ReactNode, useContext, useEffect, useId, useRef } from 'react'

import '../style.css'
import './sidebar.css'
import { Category, Settings, SettingsDictionary, Statistic, statisticCategoryTree, tableCheckboxKeys, useSetting, useSettings } from '../page_template/settings'
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
    return statisticCategoryTree.filter(category => category.show_checkbox).map(category => <StatisticCategoryTreeCategory key={category.identifier} category={category} />)
}

function getCategoryStatus(statistics: Record<string, boolean>): boolean | 'indeterminate' {
    const statisticSettings = Object.entries(statistics)
    const totalStatistics = statisticSettings.length
    const totalCheckedStatistics = statisticSettings.filter(([, checked]) => checked).length

    let result: boolean | 'indeterminate'

    switch (totalCheckedStatistics) {
        case 0:
            result = false
            break
        case totalStatistics:
            result = true
            break
        default:
            result = 'indeterminate'
            break
    }

    return result
}

function StatisticCategoryTreeCategory({ category }: { category: Category }): ReactNode {
    const settings = useContext(Settings.Context)
    const categoryStatus = getCategoryStatus(useSettings(tableCheckboxKeys(category.leaves)))

    return (
        <li>
            <CheckboxSettingCustom
                name={category.name}
                checked={categoryStatus === true}
                indeterminate={categoryStatus === 'indeterminate'}
                onChange={() => {
                    /**
                     * State machine:
                     *
                     * indeterminate -> checked -> unchecked -(if nonempty saved indeterminate)-> indeterminate
                     *                                       -(if empty saved indeterminate)-> checked
                     */
                    switch (categoryStatus) {
                        case 'indeterminate':
                            category.leaves.forEach((statistic) => { settings.setSetting(`show_statistic_${statistic.identifier}`, true) })
                            break
                        case true:
                            category.leaves.forEach((statistic) => { settings.setSetting(`show_statistic_${statistic.identifier}`, false) })
                            break
                        case false:
                            const savedDeterminate = new Set(settings.get(`statistic_category_saved_indeterminate_${category.identifier}`))
                            if (savedDeterminate.size === 0) {
                                category.leaves.forEach((statistic) => { settings.setSetting(`show_statistic_${statistic.identifier}`, true) })
                            }
                            else {
                                category.leaves.forEach((statistic) => { settings.setSetting(`show_statistic_${statistic.identifier}`, savedDeterminate.has(statistic.identifier)) })
                            }
                    }
                }}
            />
            <ul>
                {
                    category.children.map((child) => {
                        switch (child.kind) {
                            case 'category':
                                return <StatisticCategoryTreeCategory category={child} />
                            case 'statistic':
                                return <StatisticCategoryTreeStatistic statistic={child} />
                        }
                    })
                }
            </ul>
        </li>
    )
}

function StatisticCategoryTreeStatistic({ statistic }: { statistic: Statistic }): ReactNode {
    const settings = useContext(Settings.Context)
    const [checked, setSetting] = useSetting(`show_statistic_${statistic.identifier}`)
    const setChecked = (newValue: boolean): void => {
        setSetting(newValue)

        for (const category of statistic.parents) {
            const categoryStatus = getCategoryStatus(settings.getMultiple(tableCheckboxKeys(category.leaves)))

            /**
             * If we would cause the category to be in an indeterminate state, we should save that state
             */
            const savedIndeterminateKey = `statistic_category_saved_indeterminate_${category.identifier}` as const
            switch (true) {
                case categoryStatus === false && !newValue:
                    break
                case categoryStatus === false && newValue:
                    settings.setSetting(savedIndeterminateKey, [statistic.identifier])
                    break
                case categoryStatus === 'indeterminate' && !newValue:
                    settings.updateSetting(savedIndeterminateKey, indeterminate => indeterminate.filter(key => key !== statistic.identifier))
                    break
                case categoryStatus === 'indeterminate' && newValue:
                    settings.updateSetting(savedIndeterminateKey, indeterminate => [...indeterminate, statistic.identifier])
                    break
                case categoryStatus === true && !newValue:
                    settings.setSetting(savedIndeterminateKey, category.leaves.map(stat => stat.identifier).filter(key => key !== statistic.identifier))
                    break
                case categoryStatus === true && newValue:
                    break
            }
        }
    }

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
