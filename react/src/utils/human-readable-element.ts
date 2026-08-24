import type { StoredUnit } from './quantity'

export type HumanReadableElement = { type: 'atom', value: string } | { type: 'code', value: string } | { type: 'where' | 'superscript' | 'subscript' | 'parens', value: HumanReadableElement[] }
    /** Written when the name is, so that it is written in the units of whoever is reading it. */
    | { type: 'quantity', value: number, unit: StoredUnit }

export type HumanReadableName = string | HumanReadableElement[]

export function atom(value: string): HumanReadableElement[] {
    return [{ type: 'atom', value }]
}
