export type HumanReadableElement = { type: 'atom', value: string } | { type: 'code', value: string } | { type: 'where' | 'superscript' | 'subscript' | 'parens', value: HumanReadableElement[] }

export type HumanReadableName = string | HumanReadableElement[]

export function atom(value: string): HumanReadableElement[] {
    return [{ type: 'atom', value }]
}
