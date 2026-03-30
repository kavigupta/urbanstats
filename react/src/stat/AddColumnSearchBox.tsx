import React, { ReactNode, useMemo } from 'react'

import { GenericSearchBox } from '../components/search-generic'
import { possibilities } from '../mapper/settings/parseExpr'
import { Selection } from '../mapper/settings/selector-classifier'
import { addColumn } from '../urban-stats-script/add-column'
import { TypeEnvironment } from '../urban-stats-script/types-values'

import { Statistic, StatSetter } from './types'
import { mapUSSFromStat } from './utils'

interface VariableSearchResult { name: string, displayName: string }

export function AddColumnSearchBox({ stat, set, typeEnvironment }: {
    stat: Statistic
    set: StatSetter
    typeEnvironment: TypeEnvironment
}): ReactNode {
    const allVariables = useMemo(() => relevantSelections(typeEnvironment), [typeEnvironment])

    const doSearch = useMemo(() => {
        return (query: string): Promise<VariableSearchResult[]> => {
            const lowerQuery = query.toLowerCase()
            const filtered = allVariables.filter(v =>
                v.displayName.toLowerCase().includes(lowerQuery)
                || v.name.toLowerCase().includes(lowerQuery),
            )
            return Promise.resolve(filtered)
        }
    }, [allVariables])

    const colAdder = useMemo(() => addColumn(mapUSSFromStat(stat), typeEnvironment), [stat, typeEnvironment])

    if (colAdder === undefined) {
        return
    }

    const handleAddColumn = (variable: VariableSearchResult): void => {
        set({
            stat: {
                universe: stat.universe,
                articleType: stat.articleType,
                type: 'uss',
                uss: colAdder(variable.name),
            },
        }, { })
    }

    const renderMatch = (
        currentMatch: () => VariableSearchResult,
        onMouseOver: () => void,
        onClick: () => void,
        style: React.CSSProperties,
        dataTestId: string | undefined,
    ): React.ReactElement => (
        <div
            key={currentMatch().name}
            className="serif searchbox-dropdown-item"
            style={style}
            onClick={onClick}
            onMouseOver={onMouseOver}
            data-test-id={dataTestId}
        >
            {currentMatch().displayName}
        </div>
    )

    return (
        <div style={{ flexGrow: 1, minWidth: '300px' }}>
            <GenericSearchBox
                matches={[]}
                doSearch={doSearch}
                onChange={(result) => { handleAddColumn(result) }}
                autoFocus={false}
                placeholder="Add column..."
                style={{ width: '100%' }}
                renderMatch={renderMatch}
                allowEmptyQuery={true}
            />
        </div>

    )
}

function relevantSelections(typeEnvironment: TypeEnvironment): VariableSearchResult[] {
    const selections = possibilities([{ type: 'vector', elementType: { type: 'number' } }], typeEnvironment)
    return selections
        .filter((s): s is Selection & { type: 'variable' } => s.type === 'variable')
        .map((selection): VariableSearchResult => {
            const varDoc = typeEnvironment.get(selection.name)
            const displayName = varDoc?.documentation?.humanReadableName ?? selection.name
            return { name: selection.name, displayName }
        })
}
