import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { useMobileLayout } from '../utils/responsive'
import { zIndex } from '../utils/zIndex'

export function Modal({ children, onClose, isOpen }: { children: ReactNode, onClose: () => void, isOpen: boolean }): ReactNode {
    const colors = useColors()
    const isMobileLayout = useMobileLayout()

    if (!isOpen) {
        return null
    }

    return (
        <div className={isMobileLayout ? 'sidebar_mobile' : ''}style={{ position: 'fixed', backgroundColor: `${colors.background}aa`, zIndex: zIndex.modal, inset: 0 }}>
            <button style={{ position: 'absolute', top: 20, right: 35 }} onClick={onClose}>Done</button>
            <style>{'body { overflow: hidden; }'}</style>
            <div style={{
                position: 'absolute',
                inset: '20px',
                height: 'fit-content',
                maxHeight: 'calc(100% - 60px)',
                margin: 'auto',
                backgroundColor: colors.background,
                padding: '20px',
                borderRadius: 10,
                marginTop: '40px',
                overflowY: 'scroll',
                border: `1px solid ${colors.borderNonShadow}`,
            }}
            >
                {children}
            </div>
        </div>
    )
}
