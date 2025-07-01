import React, { CSSProperties, ReactNode } from 'react'

import { useColors } from './page_template/colors'
import { PageTemplate } from './page_template/template'

export function ErrorBox(props: { color?: string, children: ReactNode }): ReactNode {
    const colors = useColors()

    const errorBoxStyle: CSSProperties = {
        backgroundColor: props.color ?? colors.slightlyDifferentBackgroundFocused,
        borderRadius: '5px',
        textAlign: 'center',
        padding: '10px',
    }

    return (
        <PageTemplate showFooter={false}>
            <div style={errorBoxStyle}>
                {props.children}
            </div>
        </PageTemplate>
    )
}
