/**
 * What a name is, apart from how it is written: a quantity's units are named in these, so writing
 * one has to be able to reach the quantity that named it, and this is what keeps that from
 * circling back on itself.
 */
export type HumanReadableElement = { type: 'atom', value: string } | { type: 'code', value: string } | { type: 'where' | 'superscript' | 'subscript' | 'parens', value: HumanReadableElement[] }

export type HumanReadableName = string | HumanReadableElement[]

export function atom(value: string): HumanReadableElement[] {
    return [{ type: 'atom', value }]
}
