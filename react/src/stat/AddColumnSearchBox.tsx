import React, { ReactNode, useMemo } from 'react'

import { GenericSearchBox } from '../components/search-generic'
import { convertToMapUss } from '../mapper/settings/map-uss'
import { possibilities, Selection } from '../mapper/settings/parseExpr'
import { addColumn } from '../urban-stats-script/add-column'
import { toStatement, UrbanStatsASTExpression, UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { emptyLocation } from '../urban-stats-script/lexer'
import { extendBlockIdKwarg } from '../urban-stats-script/location'
import { TypeEnvironment } from '../urban-stats-script/types-values'
import { assert } from '../utils/defensive'

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

    const colAdder = useMemo(() => addColumn(toStatement(mapUSSFromStat(stat))), [stat])

    if (colAdder === undefined) {
        return
    }

    const handleAddColumn = (variable: VariableSearchResult): void => {
        // Add the column using addColumn
        const newAST = colAdder(locInfo => createCall(variable.name, locInfo)) as UrbanStatsASTStatement
        const newUSS = convertToMapUss(newAST)
        set({
            stat: {
                universe: stat.universe,
                articleType: stat.articleType,
                type: 'uss',
                uss: newUSS,
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

function createCall(vn: string, blockId: string | undefined): UrbanStatsASTExpression {
    assert(blockId !== undefined, 'blockId is undefined in createCall')
    const location = emptyLocation(blockId)
    const ident: UrbanStatsASTExpression = {
        type: 'identifier',
        name: { node: vn, location: emptyLocation(extendBlockIdKwarg(blockId, 'values')) },
    }
    const call: UrbanStatsASTExpression = {
        type: 'call',
        fn: {
            type: 'identifier',
            name: { node: 'column', location },
        },
        args: [{ type: 'named', name: { node: 'values', location }, value: ident }],
        entireLoc: location,
    }
    return call
}
