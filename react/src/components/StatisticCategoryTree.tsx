import React, { ReactNode, useContext, useLayoutEffect, useRef, useState } from 'react'

import { Settings, tableCheckboxKeys, useSetting, useSettings } from '../page_template/settings'
import { statisticCategoryTree, Category, changeCategorySetting, changeStatisticSetting, getCategoryStatus, Statistic } from '../page_template/statistic-settings'

import { CheckboxSettingCustom, useSidebarClasses } from './sidebar'

export function StatisticCategoryTree(): ReactNode {
    return statisticCategoryTree.filter(category => category.show_checkbox).map(category => <CategoryComponent key={category.identifier} category={category} />)
}

function CategoryComponent({ category }: { category: Category }): ReactNode {
    const settings = useContext(Settings.Context)
    const categoryStatus = getCategoryStatus(useSettings(tableCheckboxKeys(category.leaves)))
    const [isExpanded, setIsExpanded] = useSetting(`statistic_category_expanded_${category.identifier}`)
    return (
        <li>
            <button
                onClick={() => { setIsExpanded(!isExpanded) }}
                className="expandButton"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
                ▶
            </button>
            <CheckboxSettingCustom
                name={category.name}
                checked={categoryStatus === true}
                indeterminate={categoryStatus === 'indeterminate'}
                onChange={() => { changeCategorySetting(settings, category) }}
            />
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
                onChange={(newValue) => { changeStatisticSetting(settings, statistic, newValue) }}
            />
        </li>
    )
}

function CategoryContents({ category, isExpanded }: { category: Category, isExpanded: boolean }): ReactNode {
    const { sidebar_section_content } = useSidebarClasses()
    const [height, setHeight] = useState(10000) // start high so we don't animate initially
    let maxHeight = `${height}px` // 31 is an approximation
    let marginTop = '0.5em'
    if (!isExpanded) {
        maxHeight = '0px'
        marginTop = '0px'
    }
    return (
        <>
            <OffscreenCategoryContents category={category} heightCallback={setHeight} />
            <ul
                // @ts-expect-error -- inert is not in the type definitions yet
                inert={isExpanded ? undefined : ''}
                className={sidebar_section_content}
                style={{ maxHeight, marginTop, opacity: 1 }}
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
    }, [])
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
