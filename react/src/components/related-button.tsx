import React, { ReactNode, useContext, useId } from 'react'

import './related.css'
import type_ordering_idx from '../data/type_ordering_idx'
import type_to_type_category from '../data/type_to_type_category'
import { Navigator } from '../navigation/Navigator'
import { HueColors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { relationshipKey, useSetting } from '../page_template/settings'
import { useUniverse } from '../universe'
import { mixWithBackground } from '../utils/color'
import { isHistoricalCD } from '../utils/is_historical'
import { useMobileLayout } from '../utils/responsive'

import { CheckboxSetting } from './sidebar'

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
    const currentUniverse = useUniverse()
    const colors = useColors()
    const typeCategory = type_to_type_category[props.region.rowType]
    const navContext = useContext(Navigator.Context)

    let classes = `serif button_related`
    if (useMobileLayout()) {
        classes += ' button_related_mobile'
    }
    const color = colorsEach(colors.hueColors)[typeCategory]
    return (
        <li className={`linklistel${useMobileLayout() ? ' linklistel_mobile' : ''}`}>
            <a
                className={classes}
                style={{ color: colors.textMain, backgroundColor: mixWithBackground(color, colors.mixPct / 100, colors.background) }}
                {...navContext.link({ kind: 'article', longname: props.region.longname, universe: currentUniverse }, { scroll: { kind: 'position', top: 0 } })}
            >
                {props.region.shortname}
            </a>
        </li>
    )
}

function RelatedList(props: { articleType: string, buttonType: string, regions: Record<string, Region[]> }): ReactNode {
    const settingKey = relationshipKey(props.articleType, props.buttonType)
    function displayName(name: string): string {
        name = name.replaceAll('_', ' ')
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
                            settingKey={settingKey}
                            classNameToUse="related_checkbox"
                            id={checkId}
                        />
                    </div>
                </div>
                <ul className="list_of_lists">
                    {
                        Object.keys(props.regions).map((relationshipType, j) => {
                            const regions = props.regions[relationshipType]
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
                                            {displayName(relationshipType)}
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

export function Related(props: { articleType: string, related: { relationshipType: string, buttons: Region[] }[] }): ReactNode {
    // buttons[rowType][relationshipType] = <list of buttons>
    const [showHistoricalCds] = useSetting('show_historical_cds')
    const buttons: Record<string, Record<string, Region[]>> = {}
    for (const relateds of props.related) {
        const relationshipType = relateds.relationshipType
        for (const button of relateds.buttons) {
            const rowType = button.rowType
            if (!(rowType in buttons)) {
                buttons[rowType] = {}
            }
            if (!(relationshipType in buttons[rowType])) {
                buttons[rowType][relationshipType] = []
            }
            buttons[rowType][relationshipType].push(button)
        }
    }

    // get a sorted list of keys of buttons
    const buttonKeys = Object.keys(buttons).sort((a, b) =>
        type_ordering_idx[a] - type_ordering_idx[b],
    )

    const elements = []
    for (const key of buttonKeys) {
        if (!showHistoricalCds) {
            if (isHistoricalCD(key)) {
                continue
            }
        }
        elements.push(
            <RelatedList
                key={key}
                buttonType={key}
                regions={buttons[key]}
                articleType={props.articleType}
            />,
        )
    }

    return (
        <div className="related_areas">
            {elements}
        </div>
    )
}
