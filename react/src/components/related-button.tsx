import React, { ReactNode, useId } from 'react'

import './related.css'
import { article_link } from '../navigation/links'
import { HueColors, useColors } from '../page_template/colors'
import { relationship_key, useSetting } from '../page_template/settings'
import { useUniverse } from '../universe'
import { mixWithBackground } from '../utils/color'
import { useMobileLayout } from '../utils/responsive'

import { CheckboxSetting } from './sidebar'

const type_ordering_idx = require('../data/type_ordering_idx.json') as Record<string, number>
const type_to_type_category = require('../data/type_to_type_category.json') as Record<string, string>

interface Region { rowType: string, longname: string, shortname: string }

function colorsEach(colors: HueColors): Record<string, string> {
    return {
        'International': colors.red,
        'US Subdivision': colors.blue,
        'Census': colors.cyan,
        'Political': colors.purple,
        'Oddball': colors.darkGrey,
        'Kavi': colors.darkOrange,
        'School': colors.yellow,
        'Small': colors.pink,
        'Native': colors.green,
    }
}

function RelatedButton(props: { region: Region }): ReactNode {
    const curr_universe = useUniverse()
    const colors = useColors()
    const type_category = type_to_type_category[props.region.rowType]

    let classes = `serif button_related`
    if (useMobileLayout()) {
        classes += ' button_related_mobile'
    }
    const color = colorsEach(colors.hueColors)[type_category]
    return (
        <li className={`linklistel${useMobileLayout() ? ' linklistel_mobile' : ''}`}>
            <a
                className={classes}
                style={{ color: colors.textMain, backgroundColor: mixWithBackground(color, colors.mixPct / 100, colors.background) }}
                href={article_link(curr_universe, props.region.longname)}
            >
                {props.region.shortname}
            </a>
        </li>
    )
}

function RelatedList(props: { articleType: string, buttonType: string, regions: Record<string, Region[]> }): ReactNode {
    const setting_key = relationship_key(props.articleType, props.buttonType)
    function displayName(name: string): string {
        name = name.replace('_', ' ')
        // title case
        name = name.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
        })
        return name
    }

    const checkId = useId()
    const mobileLayout = useMobileLayout()

    return (
        <li className="list_of_lists">
            <div style={{ display: 'flex' }}>
                <div className="linkbox">
                    <div style={{ paddingTop: '2pt' }}>
                        <CheckboxSetting
                            name=""
                            setting_key={setting_key}
                            classNameToUse="related_checkbox"
                            id={checkId}
                        />
                    </div>
                </div>
                <ul className="list_of_lists">
                    {
                        Object.keys(props.regions).map((relationship_type, j) => {
                            const regions = props.regions[relationship_type]
                            return (
                                <ul key={j} className="linklist">
                                    <li
                                        className={`serif linklistel${mobileLayout ? ' linklistel_mobile' : ''}`}
                                        style={{
                                            fontSize:
                                                mobileLayout ? '12pt' : '10pt',
                                            paddingTop: '1pt', fontWeight: 500,
                                        }}
                                    >
                                        <label htmlFor={checkId}>
                                            {displayName(relationship_type)}
                                        </label>
                                    </li>
                                    {
                                        regions.map((row, i) => (
                                            <RelatedButton
                                                key={i}
                                                region={row}
                                            />
                                        ),
                                        )
                                    }
                                </ul>
                            )
                        },
                        )
                    }
                </ul>
            </div>
        </li>
    )
}

export function Related(props: { article_type: string, related: { relationshipType: string, buttons: Region[] }[] }): ReactNode {
    // buttons[rowType][relationshipType] = <list of buttons>
    const [showHistoricalCds] = useSetting('show_historical_cds')
    const buttons: Record<string, Record<string, Region[]>> = {}
    for (const relateds of props.related) {
        const relationship_type = relateds.relationshipType
        for (const button of relateds.buttons) {
            const row_type = button.rowType
            if (!(row_type in buttons)) {
                buttons[row_type] = {}
            }
            if (!(relationship_type in buttons[row_type])) {
                buttons[row_type][relationship_type] = []
            }
            buttons[row_type][relationship_type].push(button)
        }
    }

    // get a sorted list of keys of buttons
    const button_keys = Object.keys(buttons).sort((a, b) =>
        type_ordering_idx[a] - type_ordering_idx[b],
    )

    const elements = []
    for (const key of button_keys) {
        if (!showHistoricalCds) {
            if (key === 'Historical Congressional District') {
                continue
            }
        }
        elements.push(
            <RelatedList
                key={key}
                buttonType={key}
                regions={buttons[key]}
                articleType={props.article_type}
            />,
        )
    }

    return (
        <div className="related_areas">
            {elements}
        </div>
    )
}
