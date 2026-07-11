import { HumanReadableElement } from './human-readable-name'

function parseElements(input: string, pos: number, terminator: '}' | ')' | null): { elements: HumanReadableElement[], end: number } {
    const result: HumanReadableElement[] = []
    let atomStart = pos

    const flushAtom = (end: number): void => {
        if (end > atomStart) result.push({ type: 'atom', value: input.slice(atomStart, end) })
    }

    while (pos < input.length) {
        if (terminator !== null && input[pos] === terminator) break

        if (input.startsWith('_{', pos)) {
            flushAtom(pos)
            const inner = parseElements(input, pos + 2, '}')
            result.push({ type: 'subscript', value: inner.elements })
            pos = inner.end + 1
            atomStart = pos
            continue
        }

        if (input.startsWith('^{', pos)) {
            flushAtom(pos)
            const inner = parseElements(input, pos + 2, '}')
            result.push({ type: 'superscript', value: inner.elements })
            pos = inner.end + 1
            atomStart = pos
            continue
        }

        pos++
    }

    flushAtom(pos)
    return { elements: result, end: pos }
}

export function hre(strings: TemplateStringsArray, ...values: HumanReadableElement[][]): HumanReadableElement[] {
    const result: HumanReadableElement[] = []
    for (let i = 0; i < strings.length; i++) {
        result.push(...parseElements(strings[i], 0, null).elements)
        if (i < values.length) result.push(...values[i])
    }
    return result
}
