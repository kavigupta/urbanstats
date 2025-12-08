import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { useMobileLayout } from '../utils/responsive'
import { zIndex } from '../utils/zIndex'

import { useSidebarFontSize } from './sidebar'

export function Modal({ children, onClose, isOpen }: { children: ReactNode, onClose: () => void, isOpen: boolean }): ReactNode {
    const colors = useColors()
    const isMobileLayout = useMobileLayout()
    const fontSize = useSidebarFontSize()

    if (!isOpen) {
        return null
    }

    return (
        <div
            className={isMobileLayout ? 'sidebar_mobile' : ''}
            style={{ position: 'fixed', backgroundColor: `${colors.background}aa`, zIndex: zIndex.modal, inset: 0 }}
            data-test-id="modal-background"
        >
            <button style={{ position: 'absolute', top: 20, right: 35, fontSize }} onClick={onClose}>Done</button>
            <style>{'body { overflow: hidden; }'}</style>
            <div style={{
                position: 'absolute',
                inset: '10px',
                height: 'fit-content',
                maxHeight: 'calc(100% - 85px)',
                margin: 'auto',
                backgroundColor: colors.background,
                padding: '20px',
                borderRadius: 10,
                marginTop: 70,
                overflowY: 'scroll',
                border: `1px solid ${colors.borderNonShadow}`,
            }}
            >
                {children}
            </div>
        </div>
    )
}
