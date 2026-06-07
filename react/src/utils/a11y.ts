import React, { HTMLAttributes } from 'react'

export function withButtonRole(label: string, handler: (e: React.MouseEvent | React.KeyboardEvent) => void): HTMLAttributes<HTMLElement> {
    return {
        'tabIndex': 0,
        'role': 'button',
        'onClick': handler,
        'aria-label': label,
        'onKeyDown': (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handler(e)
            }
        },
    } satisfies HTMLAttributes<HTMLElement>
}
