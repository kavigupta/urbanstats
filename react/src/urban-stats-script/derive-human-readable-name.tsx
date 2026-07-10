import React, { ReactNode } from 'react'

export type HumanReadableElement = { type: 'atom', value: string } | { type: 'where' | 'superscript' | 'subscript' | 'parens', value: HumanReadableElement[] }

export function reifyReact(elements: HumanReadableElement[] | string): ReactNode {
    if (typeof elements === 'string') return elements
    return elements.map((element, index) => {
        switch (element.type) {
            case 'atom':
                return element.value
            case 'subscript':
                return <sub key={index}>{reifyReact(element.value)}</sub>
            case 'superscript':
                return <sup key={index}>{reifyReact(element.value)}</sup>
            case 'where':
                return (
                    <React.Fragment key={index}>
                        {' where '}
                        {reifyReact(element.value)}
                    </React.Fragment>
                )
            case 'parens':
                return (
                    <React.Fragment key={index}>
                        (
                        {reifyReact(element.value)}
                        )
                    </React.Fragment>
                )
        }
    })
}

export function reifyString(elements: HumanReadableElement[] | string): string {
    if (typeof elements === 'string') return elements
    return elements.map((element) => {
        switch (element.type) {
            case 'atom':
                return element.value
            case 'subscript':
                return `_{${reifyString(element.value)}}`
            case 'superscript':
                return `^{${reifyString(element.value)}}`
            case 'where':
                return ` where ${reifyString(element.value)}`
            case 'parens':
                return `(${reifyString(element.value)})`
        }
    }).join('')
}
