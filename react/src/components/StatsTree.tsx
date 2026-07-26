import React, { ReactNode, useEffect, useState } from 'react'

import { useIsStaged } from '../page_template/settings'
import { filterCategoriesBySearch, GroupTreeState, useAvailableCategories, useAvailableGroups, useCategoryTreeState } from '../page_template/statistic-settings'
import { Category } from '../page_template/statistic-tree'
import { useMobileLayout } from '../utils/responsive'
import { zIndex } from '../utils/zIndex'

import { ExpandButton } from './ExpandButton'
import { RenderTwiceHidden } from './RenderTwiceHidden'
import { CheckboxSettingCustom, useSidebarFontSize, useSidebarSectionContentClassName } from './sidebar'

export function StatsTree(): ReactNode {
    const [searchTerm, setSearchTerm] = useState('')
    const staging = useIsStaged()

    useEffect(() => {
        if (staging) {
            setSearchTerm('') // Don't want to hide staged stat groups
        }
    }, [staging])

    const categories = filterCategoriesBySearch(searchTerm, useAvailableCategories(), useAvailableGroups()).map(category => (
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
                data-test-id="stats-search"
            >

            </input>
            {categories}
        </div>
    )
}

function CategoryComponent({ category, hasSearchMatch }: { category: Category, hasSearchMatch: boolean }): ReactNode {
    const tree = useCategoryTreeState(category)
    const isMobileLayout = useMobileLayout()

    return (
        <li>
            <div style={{ position: 'relative' }}>
                {hasSearchMatch
                    ? null
                    : (
                            <ExpandButton
                                /* Arrows are on the right on mobile to be used with both thumbs */
                                pointing={isMobileLayout ? 'left' : 'right'}
                                isExpanded={tree.expanded}
                                data-category-id={category.id}
                                onClick={() => { tree.setExpanded(!tree.expanded) }}
                                className="expandButton"
                                style={{
                                    backgroundSize: isMobileLayout ? '24px' : '16px',
                                }}
                                aria-label={tree.expanded ? `Collapse ${category.name} category` : `Expand ${category.name} category`}
                            />
                        )}
                <CheckboxSettingCustom
                    name={category.name}
                    checked={tree.status === true}
                    indeterminate={tree.status === 'indeterminate'}
                    onChange={tree.toggle}
                    testId={`category_${category.id}`}
                    highlight={tree.highlight}
                    style={{ zIndex: zIndex.categoryCheckbox }}
                    fontSize={useSidebarFontSize()}
                />
            </div>
            <CategoryContents
                key={category.id}
                groups={tree.groups}
                isExpanded={tree.expanded || hasSearchMatch}
            />
        </li>
    )
}

function GroupComponent({ state }: { state: GroupTreeState }): ReactNode {
    return (
        <li>
            <CheckboxSettingCustom
                name={state.group.name}
                checked={state.enabled}
                onChange={state.setEnabled}
                testId={`group_${state.group.id}`}
                highlight={state.highlight}
                fontSize={useSidebarFontSize()}
            />
        </li>
    )
}

function CategoryContents({ groups, isExpanded }: { groups: GroupTreeState[], isExpanded: boolean }): ReactNode {
    const sidebarSectionContent = useSidebarSectionContentClassName()

    return (
        <RenderTwiceHidden<HTMLUListElement>>
            {(arg) => {
                switch (arg.kind) {
                    case 'hidden':
                        return (
                            <ul
                                // @ts-expect-error -- inert is not in the type definitions yet
                                inert=""
                                className={`${sidebarSectionContent} hidden`}
                                style={{ opacity: 0, position: 'absolute' }}
                                ref={arg.ref}
                            >
                                <CategoryCoreContents groups={groups} />
                            </ul>
                        )
                    case 'visible':
                        // If padding is nonzero in the element which this max height is applied to, there will be some visual jumping on load
                        let maxHeight = `${arg.height}px`
                        let marginTop = '0.5em'
                        if (!isExpanded) {
                            maxHeight = '0px'
                            marginTop = '0px'
                        }

                        return (
                            <ul
                            // @ts-expect-error -- inert is not in the type definitions yet
                                inert={isExpanded ? undefined : ''}
                                className={sidebarSectionContent}
                                style={{ maxHeight, marginTop, opacity: 1, padding: 0 }}
                            >
                                <CategoryCoreContents groups={groups} />
                            </ul>
                        )
                }
            }}
        </RenderTwiceHidden>
    )
}

function CategoryCoreContents({ groups }: { groups: GroupTreeState[] }): ReactNode {
    return groups.map(state => <GroupComponent key={state.group.id} state={state} />)
}
