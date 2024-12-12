import React, { ReactNode, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useColors } from '../page_template/colors'
import { Settings, useSetting, useSettingInfo, useSettingsInfo, useStagedSettingKeys } from '../page_template/settings'
import { changeStatGroupSetting, groupKeys, useAvailableCategories, useAvailableGroups, useCategoryStatus, useChangeCategorySetting } from '../page_template/statistic-settings'
import { Category, Group } from '../page_template/statistic-tree'
import { useMobileLayout } from '../utils/responsive'

import { CheckboxSettingCustom, useSidebarSectionContentClassName } from './sidebar'

export function StatsTree(): ReactNode {
    const [searchTerm, setSearchTerm] = useState('')
    const staging = useStagedSettingKeys() !== undefined

    useEffect(() => {
        if (staging) {
            setSearchTerm('') // Don't want to hide staged stat groups
        }
    }, [staging])

    const categories = filterSearch(searchTerm, useAvailableCategories()).map(category => (
        <CategoryComponent
            key={category.id}
            category={category}
            hasSearchMatch={searchTerm !== ''}
        />
    ))

    const isMobile = useMobileLayout()

    return (
        <div style={{ position: 'relative' }}>
            <input
                type="text"
                placeholder="Search Statistics"
                className="serif"
                style={{
                    paddingLeft: '1.25em',
                    marginBottom: isMobile ? '1.5em' : '0.5em',
                    marginTop: isMobile ? '1em' : '1px',
                    fontSize: '16px',
                    width: isMobile ? 'calc(100% / var(--mobile-sidebar-input-scale))' : '100%',
                }}
                onFocus={e => setTimeout(() => {
                    e.target.select()
                }, 0)}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value) }}
            >

            </input>
            {categories}
        </div>
    )
}

function searchMatch(searchTerm: string, targetString: string): boolean {
    return targetString.toLowerCase().includes(searchTerm.toLowerCase())
}

function filterSearch(searchTerm: string, categories: Category[]): Category[] {
    return categories.flatMap((category) => {
        if (searchMatch(searchTerm, category.name)) {
            return [category]
        }
        const contents = category.contents.filter(group => searchMatch(searchTerm, group.name))
        return contents.length > 0 ? [{ ...category, contents }] : []
    })
}

function CategoryComponent({ category, hasSearchMatch }: { category: Category, hasSearchMatch: boolean }): ReactNode {
    const categoryStatus = useCategoryStatus(category)
    const [isExpanded, setIsExpanded] = useSetting(`stat_category_expanded_${category.id}`)
    const isMobileLayout = useMobileLayout()
    const changeCategorySetting = useChangeCategorySetting(category)
    const colors = useColors()

    const groups = useAvailableGroups(category)
    const settingsInfo = useSettingsInfo(groupKeys(groups))
    const highlight = Object.values(settingsInfo).some(info => 'stagedValue' in info && info.stagedValue !== info.persistedValue)

    return (
        <li>
            <div style={{ position: 'relative' }}>
                {hasSearchMatch
                    ? null
                    : (
                            <button
                                data-category-id={category.id}
                                onClick={() => { setIsExpanded(!isExpanded) }}
                                className="expandButton"
                                style={{ transform: isExpanded ? `rotate(${isMobileLayout ? -90 : 90}deg)` : 'rotate(0deg)', color: colors.ordinalTextColor }}
                            >
                                {isMobileLayout ? '◀\ufe0e' : '▶\ufe0e' /* Arrows are on the right on mobile to be used with both thumbs */}
                            </button>
                        )}
                <CheckboxSettingCustom
                    name={category.name}
                    checked={categoryStatus === true}
                    indeterminate={categoryStatus === 'indeterminate'}
                    onChange={changeCategorySetting}
                    testId={`category_${category.id}`}
                    highlight={highlight}
                />
            </div>
            <CategoryContents
                key={category.id}
                category={category}
                isExpanded={isExpanded || hasSearchMatch}
            />
        </li>
    )
}

function GroupComponent({ group }: { group: Group }): ReactNode {
    const settings = useContext(Settings.Context)
    const [checked] = useSetting(`show_stat_group_${group.id}`)
    const info = useSettingInfo(`show_stat_group_${group.id}`)
    return (
        <li>
            <CheckboxSettingCustom
                name={group.name}
                checked={checked}
                onChange={(newValue) => { changeStatGroupSetting(settings, group, newValue) }}
                testId={`group_${group.id}`}
                highlight={'stagedValue' in info && info.stagedValue !== info.persistedValue}
            />
        </li>
    )
}

function CategoryContents({ category, isExpanded }: { category: Category, isExpanded: boolean }): ReactNode {
    const sidebar_section_content = useSidebarSectionContentClassName()
    /*
     * start high so we don't animate initially
     *
     * If padding is nonzero in the element which this max height is applied to, there will be some visual jumping on load
     */
    const [height, setHeight] = useState(10000)
    let maxHeight = `${height}px`
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
                style={{ maxHeight, marginTop, opacity: 1, padding: 0 }}
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
        let zoom = 1
        // For testing, since we use CSS zoom
        if ('currentCSSZoom' in listRef.current! && typeof listRef.current.currentCSSZoom === 'number') {
            zoom = listRef.current.currentCSSZoom
        }
        const resizeObserver = new ResizeObserver(() => {
            heightCallback(listRef.current!.getBoundingClientRect().height / zoom)
        })
        resizeObserver.observe(listRef.current!)
        heightCallback(listRef.current!.getBoundingClientRect().height / zoom)
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
