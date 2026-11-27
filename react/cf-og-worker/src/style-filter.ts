/*
 * The part of maplibre's expression language the site's style filters use. card_basemap.py rejects a style
 * using any more of it, so this needn't fail softly.
 */

export type Expression = string | number | boolean | null | Expression[]

export interface FilteredFeature {
    properties: Record<string, string | number | boolean>
    /** As VectorTileFeature numbers it */
    type: 0 | 1 | 2 | 3
}

const geometryTypes = ['Unknown', 'Point', 'LineString', 'Polygon']

type Value = string | number | boolean | null

const ordered: Record<string, (a: number, b: number) => boolean> = {
    '<': (a, b) => a < b,
    '<=': (a, b) => a <= b,
    '>': (a, b) => a > b,
    '>=': (a, b) => a >= b,
}

function compare(op: string, a: Value, b: Value): boolean {
    if (op === '==') {
        return a === b
    }
    if (op === '!=') {
        return a !== b
    }
    if (!Object.hasOwn(ordered, op)) {
        throw new Error(`Unsupported expression ${op}`)
    }
    // maplibre errors on comparing values of different types, which leaves the filter false.
    if (typeof a !== typeof b || (typeof a !== 'number' && typeof a !== 'string')) {
        return false
    }
    // Strings compare the same way under these operators.
    return ordered[op](a as number, b as number)
}

function evaluate(expression: Expression, feature: FilteredFeature): Value {
    if (!Array.isArray(expression)) {
        return expression
    }
    const [op, ...args] = expression
    const at = (i: number): Value => evaluate(args[i], feature)
    switch (op) {
        case 'all':
            return args.every((_, i) => at(i) === true)
        case 'any':
            return args.some((_, i) => at(i) === true)
        case '!':
            return at(0) !== true
        case 'get':
            return feature.properties[args[0] as string] ?? null
        case 'has':
            return Object.hasOwn(feature.properties, args[0] as string)
        case 'typeof': {
            const value = at(0)
            return value === null ? 'null' : typeof value
        }
        case 'geometry-type':
            return geometryTypes[feature.type]
        case 'match': {
            const input = at(0)
            for (let i = 1; i < args.length - 1; i += 2) {
                const labels = args[i]
                if ((Array.isArray(labels) ? labels : [labels]).includes(input)) {
                    return at(i + 1)
                }
            }
            return at(args.length - 1)
        }
    }
    return compare(op as string, at(0), at(1))
}

export function matchesFilter(filter: Expression | undefined, feature: FilteredFeature): boolean {
    return filter === undefined || evaluate(filter, feature) === true
}
