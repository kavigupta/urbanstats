import React, { CSSProperties, ReactNode } from 'react'

import { PageTemplate } from '../page_template/template'

export function QuizAuthAlertTemplate(props: { color: string, children: ReactNode }): ReactNode {
    const errorBoxStyle: CSSProperties = {
        backgroundColor: props.color,
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
