import React, { ReactNode, useContext, useLayoutEffect, useRef, useState } from 'react'

import { Settings, useSetting, useSettings } from '../page_template/settings'
import { statisticCategoryTree, Category, changeCategorySetting, changeStatGroupSetting, getCategoryStatus, Statistic, groupYearKeys, groupKeys } from '../page_template/statistic-settings'
import { useMobileLayout } from '../utils/responsive'

import { CheckboxSettingCustom, useSidebarClasses } from './sidebar'

export function StatisticCategoryTree(): ReactNode {
    return statisticCategoryTree.filter(category => category.show_checkbox).map(category => <CategoryComponent key={category.identifier} category={category} />)
}

function CategoryComponent({ category }: { category: Category }): ReactNode {
    const settings = useContext(Settings.Context)
    const categoryStatus = getCategoryStatus(useSettings(groupKeys(category.leaves)))
    const [isExpanded, setIsExpanded] = useSetting(`statistic_category_expanded_${category.identifier}`)
    const isMobileLayout = useMobileLayout()
    return (
        // Move the category left half of the indent since it's not really a child
        <li style={{ left: '-0.375em' }}>
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
                    onChange={() => { changeCategorySetting(settings, category) }}
                />
            </div>
            <CategoryContents key={category.identifier} category={category} isExpanded={isExpanded} />
        </li>
    )
}

function StatisticComponent({ statistic }: { statistic: Statistic }): ReactNode {
    const settings = useContext(Settings.Context)
    const [checked] = useSetting(`show_statistic_${statistic.identifier}`)
    return (
        <li>
            <CheckboxSettingCustom
                name={statistic.name}
                checked={checked}
                onChange={(newValue) => { changeStatGroupSetting(settings, statistic, newValue) }}
            />
        </li>
    )
}

function CategoryContents({ category, isExpanded }: { category: Category, isExpanded: boolean }): ReactNode {
    const { sidebar_section_content } = useSidebarClasses()
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
    const { sidebar_section_content } = useSidebarClasses()
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
    return category.children.map((child) => {
        switch (child.kind) {
            case 'category':
                return <CategoryComponent key={child.identifier} category={child} />
            case 'statistic':
                return <StatisticComponent key={child.identifier} statistic={child} />
        }
    })
}
