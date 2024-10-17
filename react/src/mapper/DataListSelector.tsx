import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'

import { setting_name_style } from './style'

export function DataListSelector<T extends string>({ overall_name, initial_value, names, onChange, no_neutral, header_style }: { overall_name: string | undefined, initial_value: T | undefined, names: T[], onChange: (newValue: T) => void, no_neutral?: boolean, header_style?: React.CSSProperties }): ReactNode {
    const colors = useColors()
    const names_full = no_neutral ? names : ['', ...names]
    const set_initial = initial_value !== undefined && names_full.includes(initial_value)
    const actual_selector = (
        <select
            onChange={(e) => { onChange(e.target.value as T) }}
            style={{ width: '100%', backgroundColor: colors.background, color: colors.textMain }}
            value={set_initial ? initial_value : ''}
        >
            {names_full.map((name, i) => (
                <option key={i} value={name}>{name}</option>
            ))}
        </select>
    )
    if (overall_name === undefined) return actual_selector
    return (
        <div>
            <div>
                <div style={header_style ?? setting_name_style}>
                    {overall_name}
                </div>
                {actual_selector}
                <div style={{ marginBottom: '0.25em' }} />
            </div>
        </div>
    )
}
