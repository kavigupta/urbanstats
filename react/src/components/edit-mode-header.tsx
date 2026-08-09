import React, { ReactNode } from 'react'

import { useScreenshotMode } from './screenshot'

export type EditModeHeader = EditModeButton | EditModeOpenHeader

export interface EditModeButton {
    open: false
    onEdit: () => void
    label: string
}

export interface TableEditButton extends EditModeButton {
    placement: 'top-left' | 'super-header'
}

export interface EditModeOpenHeader {
    open: true
    filter: string
    setFilter: (filter: string) => void
    onDone?: () => void
}

export function useEnterEditModeButton(editMode: EditModeHeader | undefined): ReactNode | undefined {
    const isScreenshot = useScreenshotMode()
    if (isScreenshot || editMode === undefined || editMode.open) {
        return undefined
    }
    return <HeaderButton onClick={editMode.onEdit} testId="edit-mode-edit">{editMode.label}</HeaderButton>
}

export function EditModeTopLeftHeader({ header, width }: { header: EditModeOpenHeader, width: number }): ReactNode {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '1px', width: `${width}%` }}>
            {header.onDone !== undefined && <HeaderButton onClick={header.onDone} testId="edit-mode-done">Done</HeaderButton>}
            {/*
              * `stretch` and the button's own font size line the box up with the Done button,
              * which its padding otherwise makes the taller of the two.
              */}
            <div style={{ position: 'relative', display: 'flex', flex: '1 1 auto', minWidth: 0, alignSelf: 'stretch' }}>
                <input
                    type="text"
                    className="serif"
                    placeholder="Search Statistics"
                    style={{ flex: '1 1 auto', minWidth: 0, fontSize: '18px', padding: '0 24px 0 6px' }}
                    value={header.filter}
                    onChange={(e) => { header.setFilter(e.target.value) }}
                    data-test-id="edit-mode-filter"
                />
                {header.filter !== '' && (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => { header.setFilter('') }}
                        style={{
                            position: 'absolute',
                            right: '2px',
                            top: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 4px',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                        }}
                        data-test-id="edit-mode-filter-clear"
                    >
                        <img src="/close-red-small.png" alt="" width={12} height={12} />
                    </button>
                )}
            </div>
        </div>
    )
}

function HeaderButton({ onClick, testId, children }: { onClick: () => void, testId?: string, children: ReactNode }): ReactNode {
    return (
        <button
            className="serif value"
            style={{ padding: '2px 10px', cursor: 'pointer' }}
            onClick={onClick}
            data-test-id={testId}
        >
            {children}
        </button>
    )
}
