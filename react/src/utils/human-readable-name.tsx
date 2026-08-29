import React, { ReactNode } from 'react'

import { codeStyle } from './code-style'
import { HumanReadableElement, HumanReadableName } from './human-readable-element'
import { UnitSettings, StoredUnit, writeQuantity } from './quantity'
import { trimTrailingZeros } from './text'

/**
 * A quantity written out, for a title, a card or a file, where there is no reader to ask what
 * units they read in. On a page `reifyReact` asks, and writes it in those.
 */
export function writtenPlainly(value: number, unit: StoredUnit, settings: UnitSettings): string {
    const written = writeQuantity(value, unit, settings, {})
    return `${trimTrailingZeros(written.renderedValue)}${reifyString(written.unitName, settings)}`
}

export function reifyReact(elements: HumanReadableElement[] | string, settings: UnitSettings): ReactNode {
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
                return <React.Fragment key={index}>{writtenQuantity(element.value, element.unit, settings)}</React.Fragment>
            case 'unitName':
                return <React.Fragment key={index}>{reifyReact(nameOfUnit(element.unit, settings), settings)}</React.Fragment>
        }
    })
}

/**
 * What a unit is called to whoever is reading, taken off a quantity of one of it, since which of
 * several units a quantity is written in depends on how large it is.
 */
export function nameOfUnit(unit: StoredUnit, settings: UnitSettings): HumanReadableElement[] {
    return writeQuantity(1, unit, settings, {}).unitName
}

/** One run of text, so that the unit cannot be rasterized a pixel off the number it belongs to. */
function writtenQuantity(value: number, unit: StoredUnit, settings: UnitSettings): ReactNode {
    const { renderedValue, unitName } = writeQuantity(value, unit, settings, {})
    return (
        <>
            {trimTrailingZeros(renderedValue)}
            {reifyReact(unitName, settings)}
        </>
    )
}

export function reifyString(elements: HumanReadableElement[] | string, settings: UnitSettings): string {
    if (typeof elements === 'string') return elements
    return elements.map((element) => {
        switch (element.type) {
            case 'atom':
                return element.value
            case 'code':
                return `\`${element.value}\``
            case 'subscript':
                return `_{${reifyString(element.value, settings)}}`
            case 'superscript':
                return `^{${reifyString(element.value, settings)}}`
            case 'where':
                return ` where ${reifyString(element.value, settings)}`
            case 'parens':
                return `(${reifyString(element.value, settings)})`
            case 'quantity':
                return writtenPlainly(element.value, element.unit, settings)
            case 'unitName':
                return reifyString(nameOfUnit(element.unit, settings), settings)
        }
    }).join('')
}

export function joinHumanReadableNames(names: HumanReadableName[]): HumanReadableElement[] {
    return names.flatMap((name, index): HumanReadableElement[] => {
        const elements = typeof name === 'string' ? [{ type: 'atom', value: name } satisfies HumanReadableElement] : name
        return index === 0 ? elements : [{ type: 'atom', value: ', ' }, ...elements]
    })
}
