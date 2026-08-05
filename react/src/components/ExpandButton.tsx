import React, { ComponentProps, ReactNode } from 'react'

export function ExpandButton({ isExpanded, ...buttonProps }: ComponentProps<'button'> & { isExpanded: boolean }): ReactNode {
    return (
        <button
            {...buttonProps}
            style={{
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                background: 'none',
                backgroundImage: 'url("./arrow-right.png")',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '16px',
                border: 'none',
                transition: 'transform 0.25s',
                ...buttonProps.style,
            }}
        />
    )
}
