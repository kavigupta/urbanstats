import React, { ComponentProps, ReactNode } from 'react'

export function ExpandButton({ pointing, isExpanded, ...buttonProps }: ComponentProps<'button'> & { pointing: 'left' | 'right', isExpanded: boolean }): ReactNode {
    return (
        <button
            {...buttonProps}
            /* Arrows are on the right on mobile to be used with both thumbs */
            style={{
                transform: isExpanded ? `rotate(${pointing === 'left' ? 90 : 90}deg)` : `rotate(${pointing === 'left' ? 180 : 0}deg)`,
                background: 'none',
                backgroundImage: 'url("./arrow-right.png")',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '16px',
                border: 'none',
                ...buttonProps.style,
            }}
        />
    )
}
