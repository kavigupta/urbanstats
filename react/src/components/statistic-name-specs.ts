import { statParents } from '../page_template/statistic-tree'
import { Universe } from '../universe'
import { HumanReadableName } from '../utils/human-readable-name'

import { ArticleRow } from './load-article'
import { CellSpec } from './supertable'

export type NameSpec = Extract<CellSpec, { type: 'statistic-name' }>

interface GroupAggregate {
    size: number
    sourceNames: Set<string>
}

/** Tallies each group once, so naming stays linear in the number of specs. */
function aggregateByGroup(nameSpecs: NameSpec[]): Map<string | undefined, GroupAggregate> {
    const aggregates = new Map<string | undefined, GroupAggregate>()
    for (const spec of nameSpecs) {
        if (spec.row === undefined) {
            continue
        }
        const statParent = statParents.get(spec.row.statpath)
        let aggregate = aggregates.get(statParent?.group.id)
        if (aggregate === undefined) {
            aggregate = { size: 0, sourceNames: new Set() }
            aggregates.set(statParent?.group.id, aggregate)
        }
        aggregate.size++
        if (statParent !== undefined) {
            aggregate.sourceNames.add(statParent.source.name)
        }
    }
    return aggregates
}

function getGroupAndDisplayNames(nameSpec: NameSpec, aggregates: Map<string | undefined, GroupAggregate>): [string | undefined, HumanReadableName] {
    if (nameSpec.row === undefined) {
        return [undefined, nameSpec.renderedStatname]
    }
    const statParent = statParents.get(nameSpec.row.statpath)
    const aggregate = aggregates.get(statParent?.group.id)!
    const groupSize = aggregate.size
    const groupHasMultipleSources = aggregate.sourceNames.size > 1

    const sourceName = statParent?.source.name
    let displayName = groupSize > 1 ? (statParent?.indentedName ?? nameSpec.renderedStatname) : nameSpec.renderedStatname
    if (groupHasMultipleSources && sourceName) {
        displayName = `${displayName} [${sourceName}]`
    }
    const groupName = groupSize > 1 ? statParent?.group.name : undefined
    return [groupName, displayName]
}

export function computeNameSpecsWithGroups(nameSpecs: NameSpec[]): { updatedNameSpecs: NameSpec[], groupNames: (string | undefined)[] } {
    const updatedNameSpecs: NameSpec[] = []
    const groupNames: (string | undefined)[] = []
    const aggregates = aggregateByGroup(nameSpecs)

    for (const spec of nameSpecs) {
        const [groupName, displayName] = getGroupAndDisplayNames(spec, aggregates)

        updatedNameSpecs.push({
            ...spec,
            isIndented: groupName !== undefined,
            displayName,
        })
        groupNames.push(groupName)
    }

    return { updatedNameSpecs, groupNames }
}

export function nameSpecsForRows(rows: ArticleRow[], longname: string, currentUniverse: Universe): NameSpec[] {
    return rows.map(row => ({
        type: 'statistic-name',
        longname,
        row,
        renderedStatname: row.renderedStatname,
        currentUniverse,
    }))
}
