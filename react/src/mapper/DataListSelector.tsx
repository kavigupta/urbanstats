import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'

import { settingNameStyle } from './style'

export function DataListSelector<T extends string>({ overallName, initialValue, names, onChange, noNeutral, headerStyle }: { overallName: string | undefined, initialValue: T | undefined, names: readonly T[], onChange: (newValue: T) => void, noNeutral?: boolean, headerStyle?: React.CSSProperties }): ReactNode {
    const colors = useColors()
    const namesFull = noNeutral ? names : ['', ...names]
    const setInitial = initialValue !== undefined && namesFull.includes(initialValue)
    const actualSelector = (
        <select
            onChange={(e) => { onChange(e.target.value as T) }}
            style={{ width: '100%', backgroundColor: colors.background, color: colors.textMain, padding: '3px 4px', fontSize: '14px' }}
            value={setInitial ? initialValue : ''}
        >
            {namesFull.map((name, i) => (
                <option key={i} value={name}>{name}</option>
            ))}
        </select>
    )
    if (overallName === undefined) return actualSelector
    return (
        <div>
            <div>
                <div style={headerStyle ?? settingNameStyle}>
                    {overallName}
                </div>
                {actualSelector}
                <div style={{ marginBottom: '0.25em' }} />
            </div>
        </div>
    )
}
