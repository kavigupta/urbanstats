import React, { ReactNode } from 'react'

import { codeStyle } from './code-style'
import { HumanReadableElement, HumanReadableName } from './human-readable-element'
import { UnitSettings, StoredUnit, writeQuantity } from './quantity'
import { trimTrailingZeros } from './text'

/**
 * A quantity written out, for a title, a card or a file, where there is no reader to ask what
 * units they read in. On a page `reifyReact` asks, and writes it in those.
 */
export function writtenPlainly(value: number, unit: StoredUnit, settings: ReifySettings): string {
    const written = writeQuantity(value, unit, settings, 'afterNumber')
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
        }
    })
}

/** One run of text, so that the unit cannot be rasterized a pixel off the number it belongs to. */
function writtenQuantity(value: number, unit: StoredUnit, settings: UnitSettings): ReactNode {
    const { renderedValue, unitName } = writeQuantity(value, unit, settings, 'afterNumber')
    return (
        <>
            {trimTrailingZeros(renderedValue)}
            {reifyReact(unitName, settings)}
        </>
    )
}

export interface ReifySettings extends UnitSettings {
    /** km² rather than km^{2}, for text without markup. The syntax parses back into the same elements. */
    unicode: boolean
}

const unicodeScripts = {
    subscript: new Map([
        ['0', '₀'], ['1', '₁'], ['2', '₂'], ['3', '₃'], ['4', '₄'], ['5', '₅'], ['6', '₆'], ['7', '₇'], ['8', '₈'], ['9', '₉'],
        ['+', '₊'], ['-', '₋'], ['\u2212', '₋'], ['=', '₌'], ['(', '₍'], [')', '₎'],
    ]),
    superscript: new Map([
        ['0', '⁰'], ['1', '¹'], ['2', '²'], ['3', '³'], ['4', '⁴'], ['5', '⁵'], ['6', '⁶'], ['7', '⁷'], ['8', '⁸'], ['9', '⁹'],
        ['+', '⁺'], ['-', '⁻'], ['\u2212', '⁻'], ['=', '⁼'], ['(', '⁽'], [')', '⁾'],
    ]),
}

/** Undefined when Unicode lacks a character's script. */
function inUnicodeScript(text: string, table: Map<string, string>): string | undefined {
    const chars = Array.from(text, char => table.get(char))
    return chars.every(char => char !== undefined) ? chars.join('') : undefined
}

export function reifyString(elements: HumanReadableElement[] | string, settings: ReifySettings): string {
    if (typeof elements === 'string') return elements
    return elements.map((element) => {
        switch (element.type) {
            case 'atom':
                return element.value
            case 'code':
                return `\`${element.value}\``
            case 'subscript':
            case 'superscript': {
                const inner = reifyString(element.value, settings)
                const scripted = settings.unicode ? inUnicodeScript(inner, unicodeScripts[element.type]) : undefined
                return scripted ?? `${element.type === 'subscript' ? '_' : '^'}{${inner}}`
            }
            case 'where':
                return ` where ${reifyString(element.value, settings)}`
            case 'parens':
                return `(${reifyString(element.value, settings)})`
            case 'quantity':
                return writtenPlainly(element.value, element.unit, settings)
        }
    }).join('')
}

export function joinHumanReadableNames(names: HumanReadableName[]): HumanReadableElement[] {
    return names.flatMap((name, index): HumanReadableElement[] => {
        const elements = typeof name === 'string' ? [{ type: 'atom', value: name } satisfies HumanReadableElement] : name
        return index === 0 ? elements : [{ type: 'atom', value: ', ' }, ...elements]
    })
}
