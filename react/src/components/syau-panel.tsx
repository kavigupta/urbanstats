import React, { ReactNode } from 'react'

import '../common.css'
import './quiz.css'
import type_ordering_idx from '../data/type_ordering_idx'
import universes_ordered from '../data/universes_ordered'
import { PageTemplate } from '../page_template/template'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'

export function SYAUPanel(props: { typ?: string, universe?: string }): ReactNode {
    const headerClass = useHeaderTextClass()
    const subHeaderClass = useSubHeaderTextClass()
    return (
        <PageTemplate>
            <div className={headerClass}>So you&quot;re an urbanist...</div>
            <div className={subHeaderClass}>
                Name every
                <SelectType typ={props.typ} />
                {' '}
                in
                <SelectUniverse universe={props.universe} />
                !
            </div>
            <div>
                HI!
            </div>
        </PageTemplate>
    )
}

function SelectType(props: { typ?: string }): ReactNode {
    const types = Object.entries(type_ordering_idx).map(typeorder => typeorder[0])
    return (
        <select>
            {types.map(type => (
                <option value={type} selected={type === props.typ} key={type}>{type}</option>
            ))}
        </select>
    )
}

function SelectUniverse(props: { universe?: string }): ReactNode {
    const universes = universes_ordered
    return (
        <div className="universe-select">
            <select id="universe">
                {universes.map(universe => (
                    <option value={universe} selected={universe === props.universe} key={universe}>{universe}</option>
                ))}
            </select>
        </div>
    )
}
