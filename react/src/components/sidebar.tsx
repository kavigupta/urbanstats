import React from 'react';

import "../style.css";
import "./sidebar.css";
import { useResponsive } from '../utils/responsive';
import { BooleanSettings, useSetting, useStatisticCategoryMetadataCheckboxes } from "../page_template/settings";

export function Sidebar() {
    const statistic_category_metadata_checkboxes = useStatisticCategoryMetadataCheckboxes();
    let sidebar_section_content = "sidebar-section-content";
    let sidebar_section_title = "sidebar-section-title";
    const responsive = useResponsive();
    if (responsive.mobileLayout) {
        sidebar_section_content += " sidebar-section-content_mobile";
        sidebar_section_title += " sidebar-section-title_mobile";
    }
    return (
        <div className={"serif sidebar" + (responsive.mobileLayout ? "_mobile" : "")}>
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
                            name="Use Population Percentiles"
                            setting_key="use_population_percentiles"
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
                    {statistic_category_metadata_checkboxes.map((checkbox, i) =>
                        <li key={i}>
                            <CheckboxSetting
                                name={checkbox.name}
                                setting_key={checkbox.settingKey}
                            />
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}

export function CheckboxSetting(props: { name: string, setting_key: keyof BooleanSettings }) {

    const [checked, setSetting] = useSetting(props.setting_key)

    return (
        <div className="checkbox-setting">
            <input
                type="checkbox"
                checked={checked}
                onChange={e => { setSetting(e.target.checked) }}
                style={{ accentColor: "#5a7dc3" }}
            />
            <label>{props.name}</label>
        </div>
    );
};
