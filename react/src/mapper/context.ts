import statistic_variables_info from '../data/statistic_variables_info'
import { Universe } from '../universe'
import { defaultConstants } from '../urban-stats-script/constants/constants'
import { USSDocumentedType } from '../urban-stats-script/types-values'
import { loadInsetExpression } from '../urban-stats-script/worker'
import { assert } from '../utils/defensive'

export const defaultTypeEnvironment = (universe: Universe): Map<string, USSDocumentedType> => {
    const te = new Map<string, USSDocumentedType>()

    for (const [key, value] of defaultConstants) {
        te.set(key, value)
    }

    te.set('geo', {
        type: { type: 'vector', elementType: { type: 'opaque', name: 'geoFeatureHandle' } },
        documentation: {
            humanReadableName: 'Default Universe Geography',
            category: 'map',
            longDescription: 'A vector containing geographic feature handles for the current universe. Each element represents a geographic unit (e.g., census block, county) that can be used for mapping and spatial analysis.',
        },
    })

    te.set('geoCentroid', {
        type: { type: 'vector', elementType: { type: 'opaque', name: 'geoCentroidHandle' } },
        documentation: {
            humanReadableName: 'Default Universe Geography (Centroids)',
            category: 'mapper',
            longDescription: 'A vector containing geographic centroid handles for the current universe. Each element represents the center point of a geographic unit, useful for point-based visualizations and distance calculations.',
        },
    })

    te.set('defaultInsets', {
        type: { type: 'opaque', name: 'insets' },
        documentation: {
            humanReadableName: 'Default Insets',
            category: 'mapper',
            longDescription: 'Predefined map inset configurations for the current universe (whatever that is). E.g., for the US, it would be the continental US, Alaska, Hawaii, Puerto Rico, and Guam.',
            equivalentExpressions: [loadInsetExpression(universe)],
        },
    })

    for (const variableInfo of statistic_variables_info.variableNames) {
        const order = variableInfo.order
        te.set(variableInfo.varName, {
            type: { type: 'vector', elementType: { type: 'number' } },
            documentation: {
                humanReadableName: variableInfo.humanReadableName,
                priority: variableInfo.comesFromMultiSourceSet ? 1000 + order : order,
                category: 'mapper',
                longDescription: `Data from ${variableInfo.humanReadableName}`,
                documentationTable: 'mapper-data-variables',
            },
        })
    }
    for (const [name, info] of statistic_variables_info.multiSourceVariables) {
        // Find the minimum priority of the individual variables (using raw order values)
        const individualPriorities = info.individualVariables.map((varName) => {
            const variableInfo = statistic_variables_info.variableNames.find(v => v.varName === varName)
            assert(variableInfo !== undefined, `Variable info for ${varName} not found`)
            return variableInfo.order
        })
        const minPriority = Math.min(...individualPriorities)

        te.set(name, {
            type: { type: 'vector', elementType: { type: 'number' } },
            documentation: {
                humanReadableName: info.humanReadableName,
                priority: minPriority,
                category: 'mapper',
                longDescription: `Data from ${info.humanReadableName} (from whatever source is most reliable)`,
                documentationTable: 'mapper-data-variables',
                isDefault: name === 'density_pw_1km',
            },
        })
    }

    return te
}
