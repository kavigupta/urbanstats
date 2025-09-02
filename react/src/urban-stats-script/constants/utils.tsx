import React, { ReactNode } from 'react'

import { useColors } from '../../page_template/colors'
import { Documentation } from '../types-values'

export function camelToHuman(str: string): string {
    const pascal = str.charAt(0).toUpperCase() + str.slice(1)
    return pascal.replaceAll(/([A-Z])/g, ' $1').trim()
}

export function longDescriptionSubtitle(doc: Documentation): ReactNode {
    return <LongDescriptionSubtitle doc={doc} />
}

function LongDescriptionSubtitle(props: { doc: Documentation }): ReactNode {
    const colors = useColors()
    return (
        <>
            <div>{props.doc.humanReadableName}</div>
            <div style={{ fontSize: 'smaller', color: colors.ordinalTextColor }}>
                {props.doc.longDescription}
            </div>
        </>
    )
}
