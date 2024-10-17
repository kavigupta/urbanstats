import React, { ReactNode, useContext, useLayoutEffect, useRef, useState } from 'react'

import { Settings, useSetting } from '../page_template/settings'
import { Category, changeStatGroupSetting, Group, useAvailableCategories, useAvailableGroups, useCategoryStatus, useChangeCategorySetting } from '../page_template/statistic-settings'
import { useMobileLayout } from '../utils/responsive'

import { CheckboxSettingCustom, useSidebarSectionContentClassName } from './sidebar'

export function StatsTree(): ReactNode {
    return useAvailableCategories().map(category => <CategoryComponent key={category.id} category={category} />)
}

function CategoryComponent({ category }: { category: Category }): ReactNode {
    const categoryStatus = useCategoryStatus(category)
    const [isExpanded, setIsExpanded] = useSetting(`stat_category_expanded_${category.id}`)
    const isMobileLayout = useMobileLayout()
    const changeCategorySetting = useChangeCategorySetting(category)
    return (
        <li>
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => { setIsExpanded(!isExpanded) }}
                    className="expandButton"
                    style={{ transform: isExpanded ? `rotate(${isMobileLayout ? -90 : 90}deg)` : 'rotate(0deg)' }}
                >
                    {isMobileLayout ? '◀' : '▶' /* Arrows are on the right on mobile to be used with both thumbs */}
                </button>
                <CheckboxSettingCustom
                    name={category.name}
                    checked={categoryStatus === true}
                    indeterminate={categoryStatus === 'indeterminate'}
                    onChange={changeCategorySetting}
                />
            </div>
            <CategoryContents key={category.id} category={category} isExpanded={isExpanded} />
        </li>
    )
}

function GroupComponent({ group }: { group: Group }): ReactNode {
    const settings = useContext(Settings.Context)
    const [checked] = useSetting(`show_stat_group_${group.id}`)
    return (
        <li>
            <CheckboxSettingCustom
                name={group.name}
                checked={checked}
                onChange={(newValue) => { changeStatGroupSetting(settings, group, newValue) }}
            />
        </li>
    )
}

function CategoryContents({ category, isExpanded }: { category: Category, isExpanded: boolean }): ReactNode {
    const sidebar_section_content = useSidebarSectionContentClassName()
    const [height, setHeight] = useState(10000) // start high so we don't animate initially
    let maxHeight = `${height}px`
    let marginTop = '0.5em'
    let padding = '1px 0' // Need 1px padding so checkboxes don't get clipped on iPhone
    if (!isExpanded) {
        maxHeight = '0px'
        marginTop = '0px'
        padding = '0px'
    }
    return (
        <>
            <OffscreenCategoryContents category={category} heightCallback={setHeight} />
            <ul
                // @ts-expect-error -- inert is not in the type definitions yet
                inert={isExpanded ? undefined : ''}
                className={sidebar_section_content}
                style={{ maxHeight, marginTop, opacity: 1, padding }}
            >
                <CategoryCoreContents category={category} />
            </ul>
        </>
    )
}

// Used for calculating size during animations
function OffscreenCategoryContents({ category, heightCallback }: { category: Category, heightCallback: (height: number) => void }): ReactNode {
    const sidebar_section_content = useSidebarSectionContentClassName()
    const listRef = useRef<HTMLUListElement>(null)
    useLayoutEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            heightCallback(listRef.current!.getBoundingClientRect().height)
        })
        resizeObserver.observe(listRef.current!)
        heightCallback(listRef.current!.getBoundingClientRect().height)
        return () => { resizeObserver.disconnect() }
    }, [heightCallback])
    return (
        <ul
            // @ts-expect-error -- inert is not in the type definitions yet
            inert=""
            className={`${sidebar_section_content} hidden`}
            style={{ opacity: 0, position: 'absolute' }}
            ref={listRef}
        >
            <CategoryCoreContents category={category} />
        </ul>
    )
}

function CategoryCoreContents({ category }: { category: Category }): ReactNode {
    return useAvailableGroups(category).map(group => <GroupComponent key={group.id} group={group} />)
}
