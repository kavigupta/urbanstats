import React, { CSSProperties, ReactNode, useContext, useId } from 'react'

import relatedButtonColors from '../data/relatedButtonColors'
import type_ordering_idx from '../data/type_ordering_idx'
import type_to_type_category from '../data/type_to_type_category'
import { Navigator } from '../navigation/Navigator'
import { HueColors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { relationshipKey, useSetting } from '../page_template/settings'
import { useUniverse } from '../universe'
import { DefaultMap } from '../utils/DefaultMap'
import { mixWithBackground } from '../utils/color'
import { isHistoricalCD } from '../utils/is_historical'
import { useMobileLayout } from '../utils/responsive'
import { displayType } from '../utils/text'

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

function useRelatedColor(rowType: string): string {
    const colors = useColors()
    const typeCategory = type_to_type_category[rowType]
    const color = colorsEach(colors.hueColors)[typeCategory]
    return mixWithBackground(color, colors.mixPct / 100, colors.background)
}

function RelatedButton(props: { region: Region }): ReactNode {
    const currentUniverse = useUniverse()
    const colors = useColors()
    const navContext = useContext(Navigator.Context)

    let classes = `serif button_related`
    if (useMobileLayout()) {
        classes += ' button_related_mobile'
    }
    return (
        <li style={useLinkedListelStyle()}>
            <a
                className={classes}
                style={{
                    color: colors.textMain,
                    backgroundColor: useRelatedColor(props.region.rowType),
                }}
                {...navContext.link(
                    { kind: 'article', longname: props.region.longname, universe: currentUniverse },
                    { scroll: { kind: 'position', top: 0 } },
                )}
            >
                {props.region.shortname}
            </a>
        </li>
    )
}

function Label(props: { checkId: string, children: ReactNode, fontWeight: number }): ReactNode {
    return (
        <div
            className="serif"
            style={{
                ...useLinkedListelStyle(),
                fontSize: useMobileLayout() ? '12pt' : '10pt',
                paddingTop: '1pt',
                fontWeight: props.fontWeight,
                alignContent: 'center',
            }}
        >
            <label htmlFor={props.checkId}>
                {props.children}
            </label>
        </div>
    )
}

const propForRegionTypes = 0.20

function Cell(props: { widthProp: number, children: ReactNode }): ReactNode {
    return (
        <div style={{
            display: 'flex',
            width: `${100 * props.widthProp}%`,
            alignItems: 'center',
        }}
        >
            { props.children }
        </div>
    )
}

function RelationshipGroup(props: { regions: Region[], checkId: string, relationshipType: string, numColumns: number }): ReactNode {
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
                display: 'block',
                paddingInlineStart: '0px',
                listStyleType: 'none',
                margin: '0.1em',
            }}
        >
            <Label checkId={props.checkId} fontWeight={300}>
                {displayName(props.relationshipType)}
            </Label>
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

function Row(props: {
    articleType: string
    buttonType: string
    regions: Map<string, Region[]>
    rowIndex: number
    totalRows: number
    numColumns: number
}): ReactNode {
    const settingKey = relationshipKey(props.articleType, props.buttonType)

    const checkId = useId()

    const universe = useUniverse()

    return (
        <li style={{
            paddingInlineStart: '0px',
            listStyleType: 'none',
            margin: 0,
            backgroundColor: `${useRelatedColor(props.buttonType)}${props.rowIndex % 2 === 0 ? '33' : '55'}`,
            width: '100%',
            // Border radius if first or last row
            borderRadius: props.rowIndex === 0 ? '5px 5px 0 0' : (props.rowIndex === props.totalRows - 1 ? '0 0 5px 5px' : undefined),
            display: 'flex',
            alignItems: 'center',
        }}
        >
            <Cell widthProp={propForRegionTypes}>
                <CheckboxSetting
                    name=""
                    settingKey={settingKey}
                    classNameToUse="related_checkbox"
                    id={checkId}
                />
                <Label checkId={checkId} fontWeight={500}>
                    {displayType(universe, props.buttonType)}
                </Label>
            </Cell>
            <ul style={{
                paddingInlineStart: '0px',
                listStyleType: 'none',
                margin: 0,
                width: `${100 * (1 - propForRegionTypes)}%`,
                display: 'flex',
                flexDirection: 'column',
            }}
            >
                {
                    Array.from(props.regions).map(([relationshipType, regions]) => {
                        return (
                            <RelationshipGroup
                                key={relationshipType}
                                regions={regions}
                                checkId={checkId}
                                relationshipType={relationshipType}
                                numColumns={props.numColumns}
                            />
                        )
                    })
                }
            </ul>
        </li>
    )
}

export function Related(props: { articleType: string, related: { relationshipType: string, buttons: Region[] }[] }): ReactNode {
    // buttons[rowType][relationshipType] = <list of buttons>
    const [showHistoricalCds] = useSetting('show_historical_cds')
    const buttons = new DefaultMap<string, DefaultMap<string, Region[]>>(() => new DefaultMap(() => []))
    for (const relateds of props.related) {
        for (const button of relateds.buttons) {
            buttons.get(button.rowType).get(relateds.relationshipType).push(button)
        }
    }

    // get a sorted list of keys of buttons
    const buttonKeys = Array.from(buttons.keys())
        .sort((a, b) => type_ordering_idx[a] - type_ordering_idx[b])
        .filter(buttonKey => showHistoricalCds || !isHistoricalCD(buttonKey))

    const numColumns = buttonKeys.reduce((result, buttonKey) => Math.max(result, buttons.get(buttonKey).size), 0)

    const elements = buttonKeys.map((key, i) => (
        <Row
            key={key}
            buttonType={key}
            regions={buttons.get(key)}
            articleType={props.articleType}
            rowIndex={i}
            totalRows={buttonKeys.length}
            numColumns={numColumns}
        />
    ))

    return (
        <ul style={{
            margin: '1em 0',
            paddingInlineStart: '0px',
            listStyleType: 'none',
        }}
        >
            {elements}
        </ul>
    )
}
