/** Apart from the writing of a name, which may then use the quantity module, as this must not. */
export type HumanReadableElement = { type: 'atom', value: string } | { type: 'code', value: string } | { type: 'where' | 'superscript' | 'subscript' | 'parens', value: HumanReadableElement[] }

export type HumanReadableName = string | HumanReadableElement[]

export function atom(value: string): HumanReadableElement[] {
    return [{ type: 'atom', value }]
}
