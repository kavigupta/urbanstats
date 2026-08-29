import type { StoredUnit } from './quantity'

export type HumanReadableElement = { type: 'atom', value: string } | { type: 'code', value: string } | { type: 'where' | 'superscript' | 'subscript' | 'parens', value: HumanReadableElement[] }
    /** Written where the name is, so that it is written in the units of whoever is reading. */
    | { type: 'quantity', value: number, unit: StoredUnit }
    /** The name of a unit with no quantity of it to write, as in "in km^{2}". */
    | { type: 'unitName', unit: StoredUnit }

export type HumanReadableName = string | HumanReadableElement[]

export function atom(value: string): HumanReadableElement[] {
    return [{ type: 'atom', value }]
}
