import React, { ReactNode } from 'react'

import { codeStyle } from './code-style'
import { HumanReadableElement, HumanReadableName } from './human-readable-element'
import { ReaderSettings, StoredUnit, writeQuantity } from './quantity'
import { trimTrailingZeros } from './text'

/**
 * A quantity written out, for a title, a card or a file, where there is no reader to ask what
 * units they read in. On a page `reifyReact` asks, and writes it in those.
 */
export function writtenPlainly(value: number, unit: StoredUnit, settings: ReaderSettings): string {
    const written = writeQuantity(value, unit, settings)
    return `${trimTrailingZeros(written.renderedValue)}${reifyString(written.unitName)}`
}

export function reifyReact(elements: HumanReadableElement[] | string, settings: ReaderSettings): ReactNode {
    if (typeof elements === 'string') return elements
    return elements.map((element, index) => {
        switch (element.type) {
            case 'atom':
                return element.value
            case 'code':
                return <code key={index} style={codeStyle}>{element.value}</code>
            case 'subscript':
                return <sub key={index}>{reifyReact(element.value, settings)}</sub>
            case 'superscript':
                return <sup key={index}>{reifyReact(element.value, settings)}</sup>
            case 'where':
                return (
                    <React.Fragment key={index}>
                        {' where '}
                        {reifyReact(element.value, settings)}
                    </React.Fragment>
                )
            case 'parens':
                return (
                    <React.Fragment key={index}>
                        (
                        {reifyReact(element.value, settings)}
                        )
                    </React.Fragment>
                )
            case 'quantity':
                return writtenQuantity(element.value, element.unit, settings)
        }
    })
}

/** One run of text, so that the unit cannot be rasterized a pixel off the number it belongs to. */
function writtenQuantity(value: number, unit: StoredUnit, settings: ReaderSettings): ReactNode {
    const { renderedValue, unitName } = writeQuantity(value, unit, settings)
    return (
        <>
            {trimTrailingZeros(renderedValue)}
            {reifyReact(unitName, settings)}
        </>
    )
}

export function reifyString(elements: HumanReadableElement[] | string): string {
    if (typeof elements === 'string') return elements
    return elements.map((element) => {
        switch (element.type) {
            case 'atom':
                return element.value
            case 'code':
                return `\`${element.value}\``
            case 'subscript':
                return `_{${reifyString(element.value)}}`
            case 'superscript':
                return `^{${reifyString(element.value)}}`
            case 'where':
                return ` where ${reifyString(element.value)}`
            case 'parens':
                return `(${reifyString(element.value)})`
            case 'quantity':
                // a string has no reader to ask, so it is written in the units the site is written in
                return writtenPlainly(element.value, element.unit, {})
        }
    }).join('')
}

export function joinHumanReadableNames(names: HumanReadableName[]): HumanReadableElement[] {
    return names.flatMap((name, index): HumanReadableElement[] => {
        const elements = typeof name === 'string' ? [{ type: 'atom', value: name } satisfies HumanReadableElement] : name
        return index === 0 ? elements : [{ type: 'atom', value: ', ' }, ...elements]
    })
}
