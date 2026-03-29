import React, { AnchorHTMLAttributes, ReactNode, useContext, useEffect, useId, useState } from 'react'

import relatedButtonColors from '../data/relatedButtonColors'
import type_ordering_idx from '../data/type_ordering_idx'
import type_to_type_category from '../data/type_to_type_category'
import { Navigator } from '../navigation/Navigator'
import { HueColors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { relationshipKey, useSettings } from '../page_template/settings'
import { useUniverse } from '../universe'
import { DefaultMap } from '../utils/DefaultMap'
import { mixWithBackground } from '../utils/color'
import { assert } from '../utils/defensive'
import { useMobileLayout } from '../utils/responsive'
import { isAllowedToBeShown } from '../utils/restricted-types'
import { displayType } from '../utils/text'

import { CheckboxSetting } from './sidebar'

interface Region { rowType: string, longname: string, shortname: string }

const propForRegionTypes = 0.20
const spacing = 2

function colorsEach(colors: HueColors): Record<string, string> {
    const keys: [string, string][] = relatedButtonColors.map(
        ([typ, color]) => [typ, colors[color]],
    )
    return Object.fromEntries(keys)
}

function useRelatedColor(rowType: string, colorIntensity: number): string {
    const colors = useColors()
    const typeCategory = type_to_type_category[rowType]
    const color = colorsEach(colors.hueColors)[typeCategory]
    return mixWithBackground(color, (colors.mixPct + (100 - colors.mixPct) * (1 - colorIntensity)) / 100, colors.background)
}

function RelatedButton(props: { region: Region }): ReactNode {
    const currentUniverse = useUniverse()
    const navContext = useContext(Navigator.Context)
    return (
        <RelatedButtonLayout
            rowType={props.region.rowType}
            {...navContext.link(
                { kind: 'article', longname: props.region.longname, universe: currentUniverse },
                { scroll: { kind: 'position', top: 0 } },
            )}
        >
            {props.region.shortname}
        </RelatedButtonLayout>
    )
}

function RelatedButtonLayout({ rowType, children, ...anchorProps }: { rowType: string, children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>): ReactNode {
    const colors = useColors()
    return (
        <li style={{
            display: 'flex',
            margin: `${spacing}px`,
        }}
        >
            <a
                className="serif"
                {...anchorProps}
                style={{
                    color: colors.textMain,
                    backgroundColor: useRelatedColor(rowType, 1),
                    textDecoration: 'none',
                    padding: '2px 6px 2px 6px',
                    borderRadius: '5px',
                    fontWeight: 400,
                    fontSize: useMobileLayout() ? '12pt' : '8pt',
                    ...anchorProps.style,
                }}
            >
                {children}
            </a>
        </li>
    )
}

function Label(props: { checkId: string, children: ReactNode, fontWeight: number }): ReactNode {
    return (
        <div
            className="serif"
            style={{
                fontSize: useMobileLayout() ? '12pt' : '10pt',
                fontWeight: props.fontWeight,
                alignContent: 'center',
                margin: `${spacing}px`,
            }}
        >
            <label htmlFor={props.checkId}>
                {props.children}
            </label>
        </div>
    )
}

const maxRegions = 10

function displayName(name: string): string {
    name = name.replaceAll('_', ' ')
    // title case
    name = name.replace(/\w\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
    })
    return name
}

function RelationshipGroup(props: {
    regions: Region[]
    checkId: string
    relationshipType: string
    groupIndex: number
    buttonType: string
    numGroups: number
    isSearching: boolean
}): ReactNode {
    const backgroundColor = useRelatedColor(props.buttonType, props.groupIndex % 2 === 0 ? 0.3 : 0.4)

    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        setExpanded(false)
    }, [props.relationshipType])

    const colors = useColors()

    return (
        <ul
            style={{
                display: 'flex',
                flexFlow: 'row wrap',
                paddingInlineStart: '0px',
                listStyleType: 'none',
                padding: `${spacing}px`,
                paddingLeft: `${spacing}px`, // Prevents errors
                ...(props.numGroups > 1
                    ? {
                            backgroundColor,
                            // Border radius if first or last group
                            borderRadius: props.groupIndex === 0 ? '5px 5px 0 0' : (props.groupIndex === props.numGroups - 1 ? '0 0 5px 5px' : undefined),
                            paddingLeft: `${2 * spacing}px`,
                        }
                    : {}),
            }}
        >
            <Label checkId={props.checkId} fontWeight={400}>
                {displayName(props.relationshipType)}
            </Label>
            {
                (expanded || props.isSearching ? props.regions : props.regions.slice(0, maxRegions)).map((row, i) => (
                    <RelatedButton
                        key={i}
                        region={row}
                    />
                ),
                )
            }
            {props.regions.length > maxRegions && !props.isSearching && (
                <RelatedButtonLayout
                    rowType={props.regions[0].rowType}
                    onClick={() => { setExpanded(e => !e) }}
                    style={{
                        cursor: 'pointer',
                        border: `1px solid ${colors.borderShadow}`,
                        backgroundColor: colors.slightlyDifferentBackground,
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setExpanded(e => !e)
                        }
                    }}
                >
                    {expanded ? 'Less' : 'More...'}
                </RelatedButtonLayout>
            )}
        </ul>
    )
}

function Row(props: {
    articleType: string
    buttonType: string
    regions: Map<string, Region[]>
    rowIndex: number
    totalRows: number
    isSearching: boolean
}): ReactNode {
    const settingKey = relationshipKey(props.articleType, props.buttonType)

    const checkId = useId()

    const universe = useUniverse()
    assert(universe !== undefined, 'no universe')

    return (
        <li style={{
            paddingInlineStart: '0px',
            listStyleType: 'none',
            margin: 0,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            backgroundColor: useRelatedColor(props.buttonType, props.rowIndex % 2 === 0 ? 0.1 : 0.2),
            // Border radius if first or last row
            borderRadius: props.rowIndex === 0 ? '5px 5px 0 0' : (props.rowIndex === props.totalRows - 1 ? '0 0 5px 5px' : undefined),
        }}
        >
            <div style={{
                display: 'flex',
                width: `${100 * propForRegionTypes}%`,
                alignItems: 'center',
            }}
            >
                <CheckboxSetting
                    name=""
                    settingKey={settingKey}
                    classNameToUse="related_checkbox"
                    id={checkId}
                />
                <Label checkId={checkId} fontWeight={500}>
                    {displayType(universe, props.buttonType)}
                </Label>
            </div>
            <ul style={{
                paddingInlineStart: '0px',
                listStyleType: 'none',
                margin: 0,
                width: `${100 * (1 - propForRegionTypes)}%`,
                display: 'flex',
                flexDirection: 'column',
                padding: props.regions.size > 1 ? `${2 * spacing}px` : `0 0 0 ${3 * spacing}px`,
            }}
            >
                {
                    Array.from(props.regions).map(([relationshipType, regions], i) => {
                        return (
                            <RelationshipGroup
                                key={relationshipType}
                                regions={regions}
                                checkId={checkId}
                                relationshipType={relationshipType}
                                groupIndex={i}
                                buttonType={props.buttonType}
                                numGroups={props.regions.size}
                                isSearching={props.isSearching}
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
    const showSettings = useSettings(['show_historical_cds', 'show_person_circles'])
    const buttons = new DefaultMap<string, DefaultMap<string, Region[]>>(() => new DefaultMap(() => []))

    const universe = useUniverse()
    assert(universe !== undefined, 'no universe')

    const [searchTerm, setSearchTerm] = useState('')

    const searchMatch = (target: string): boolean => target.toLowerCase().includes(searchTerm.toLowerCase())

    for (const relateds of props.related) {
        const relationshipMatches = searchMatch(displayName(relateds.relationshipType))
        for (const button of relateds.buttons) {
            if (relationshipMatches || searchMatch(displayType(universe, button.rowType)) || searchMatch(button.longname) || searchMatch(button.shortname)) {
                buttons.get(button.rowType).get(relateds.relationshipType).push(button)
            }
        }
    }

    // get a sorted list of keys of buttons
    const buttonKeys = Array.from(buttons.keys())
        .sort((a, b) => type_ordering_idx[a] - type_ordering_idx[b])
        .filter(buttonKey => isAllowedToBeShown(buttonKey, showSettings))

    const elements = buttonKeys.map((key, i) => (
        <Row
            key={key}
            buttonType={key}
            regions={buttons.get(key)}
            articleType={props.articleType}
            rowIndex={i}
            totalRows={buttonKeys.length}
            isSearching={searchTerm !== ''}
        />
    ))

    return (
        <>
            <input
                type="text"
                placeholder="Filter Related Regions"
                className="serif"
                style={{
                    paddingLeft: '1.25em',
                    marginBottom: '0.5em',
                    marginTop: '1em',
                    fontSize: '16px',
                    width: '100%',
                }}
                onFocus={e => setTimeout(() => {
                    e.target.select()
                }, 0)}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value) }}
                data-test-id="related-search"
            />
            <ul style={{
                marginBottom: '1em',
                marginTop: 0,
                paddingInlineStart: '0px',
                listStyleType: 'none',
            }}
            >
                {elements}
            </ul>
        </>
    )
}
