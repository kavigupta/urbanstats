import React, { CSSProperties, ReactNode, useContext, useId } from 'react'

import relatedButtonColors from '../data/relatedButtonColors'
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
    const keys: [string, string][] = relatedButtonColors.map(
        ([typ, color]) => [typ, colors[color]],
    )
    return Object.fromEntries(keys)
}

function useLinkedListelStyle(): CSSProperties {
    const isMobile = useMobileLayout()
    return {
        minHeight: isMobile ? '20pt' : '13pt',
        marginTop: isMobile ? '0px' : '1px',
        marginBottom: isMobile ? '0px' : '1px',
        float: 'left',
        paddingRight: '0.3em',
        verticalAlign: 'middle',
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
        <li style={useLinkedListelStyle()}>
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

function RelationshipGroup(props: { regions: Region[], checkId: string, relationshipType: string }): ReactNode {
    function displayName(name: string): string {
        name = name.replaceAll('_', ' ')
        // title case
        name = name.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
        })
        return name
    }

    return (
        <ul
            style={{
                display: 'inline-block',
                paddingInlineStart: '0px',
                listStyleType: 'none',
                flexGrow: 1,
                margin: '0.1em',
            }}
        >
            <li
                className="serif"
                style={{
                    ...useLinkedListelStyle(),
                    fontSize:
                useMobileLayout() ? '12pt' : '10pt',
                    paddingTop: '1pt', fontWeight: 500,
                }}
            >
                <label htmlFor={props.checkId}>
                    {displayName(props.relationshipType)}
                </label>
            </li>
            {
                props.regions.map((row, i) => (
                    <RelatedButton
                        key={i}
                        region={row}
                    />
                ),
                )
            }
        </ul>
    )
}

function RelatedList(props: { articleType: string, buttonType: string, regions: Record<string, Region[]> }): ReactNode {
    const settingKey = relationshipKey(props.articleType, props.buttonType)

    const checkId = useId()

    return (
        <li style={{
            paddingInlineStart: '0px',
            listStyleType: 'none',
            flexGrow: 1,
            margin: 0,
        }}
        >
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
                <ul style={{
                    paddingInlineStart: '0px',
                    listStyleType: 'none',
                    flexGrow: 1,
                    margin: 0,
                }}
                >
                    {
                        Object.keys(props.regions).map((relationshipType) => {
                            return <RelationshipGroup key={relationshipType} regions={props.regions[relationshipType]} checkId={checkId} relationshipType={relationshipType} />
                        })
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
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'start',
            flexGrow: 1,
            flexBasis: 0,
            margin: '1em',
        }}
        >
            {elements}
        </div>
    )
}
