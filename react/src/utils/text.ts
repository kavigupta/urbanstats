import localized_type_names from '../data/localized_type_names'

export function display_type(universe: string, type: string): string {
    return pluralize(localize(universe, type))
}

function pluralize(type: string): string {
    if (type.endsWith('y')) {
        return `${type.slice(0, -1)}ies`
    }
    return `${type}s`
}

function localize(universe: string, type: string): string {
    for (const [universeSuffix, types] of localized_type_names) {
        if (universe.endsWith(universeSuffix)) {
            if (type in types) {
                return types[type]
            }
        }
    }
    return type
}
