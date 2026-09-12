import React, { ReactNode, useCallback } from 'react'

import { CheckboxSettingCustom } from '../../components/checkbox-setting'
import { DisplayResults } from '../../urban-stats-script/Editor'
import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { extendBlockIdPositionalArg, extendBlockIdVectorElement } from '../../urban-stats-script/location'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { AssignmentsResult } from '../../urban-stats-script/workerManager'

import { AutoUXEditor } from './AutoUXEditor'
import { BetterSelector, SelectorRenderResult } from './BetterSelector'
import { CustomEditor } from './CustomEditor'
import { ActionOptions } from './EditMapperPanel'
import {
    buildComparison, buildGroup, changeConditionKind, classifyCondition, comparisonLhsTypes, comparisonOperators,
    comparisonRhsTypes, conditionKinds, ComparisonOperator, Condition, ConditionKind, defaultComparison, isNoCondition,
    noCondition,
} from './condition'

interface NodeProps {
    typeEnvironment: TypeEnvironment
    errors: EditorError[]
    blockIdent: string
    assignments: AssignmentsResult
}

export function ConditionEditor({
    condition,
    setCondition,
    ...nodeProps
}: {
    condition: UrbanStatsASTExpression
    setCondition: (conditionExpr: UrbanStatsASTExpression, options: ActionOptions) => void
} & NodeProps): ReactNode {
    const enabled = !isNoCondition(condition)

    return (
        <div style={{ margin: '0.5em 0' }}>
            <CheckboxSettingCustom
                name="Filter?"
                checked={enabled}
                onChange={(checked) => {
                    setCondition(
                        checked ? defaultComparison(nodeProps.blockIdent, nodeProps.typeEnvironment) : noCondition(nodeProps.blockIdent),
                        {},
                    )
                }}
            />
            {enabled && <ConditionNodeEditor uss={condition} setUss={setCondition} {...nodeProps} />}
        </div>
    )
}

const kindLabels: Record<ConditionKind, string> = {
    '&': 'All of',
    '|': 'Any of',
    'comparison': 'Comparison',
    'custom': 'Custom Expression',
}

const operatorLabels: Record<ComparisonOperator, string> = {
    '==': '=',
    '!=': '≠',
    '<': '<',
    '<=': '≤',
    '>': '>',
    '>=': '≥',
}

function renderKind(kind: ConditionKind): SelectorRenderResult {
    return { text: kindLabels[kind] }
}

function renderOperator(operator: ComparisonOperator): SelectorRenderResult {
    return { text: operatorLabels[operator] }
}

function ConditionNodeEditor({
    uss,
    setUss,
    remove,
    ...nodeProps
}: {
    uss: UrbanStatsASTExpression
    setUss: (u: UrbanStatsASTExpression, o: ActionOptions) => void
    remove?: () => void
} & NodeProps): ReactNode {
    const { blockIdent, typeEnvironment, errors } = nodeProps
    const classified = classifyCondition(uss)

    const setKind = useCallback((kind: ConditionKind) => {
        setUss(changeConditionKind(uss, kind, blockIdent, typeEnvironment), {})
    }, [uss, setUss, blockIdent, typeEnvironment])

    const ourErrors = errors.filter(e => e.location.start.block.type === 'single' && e.location.start.block.ident === blockIdent)

    return (
        <div
            style={{
                display: 'grid',
                // The button sits beside the selector, and everything below lines up with the selector rather than the button
                gridTemplateColumns: remove === undefined ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) auto',
                columnGap: '0.5em',
                rowGap: '0.25em',
                width: '100%',
            }}
            id={`condition-editor-${blockIdent}`}
        >
            <BetterSelector<ConditionKind>
                value={classified.kind}
                possibleValues={conditionKinds}
                renderValue={renderKind}
                onChange={setKind}
            />
            {remove !== undefined && (
                <button style={{ alignSelf: 'center' }} onClick={remove} title="Remove condition">
                    –
                </button>
            )}
            <div style={{ gridColumn: 1 }}>
                <ConditionBody classified={classified} setUss={setUss} {...nodeProps} />
            </div>
            {ourErrors.length > 0 && (
                <div style={{ gridColumn: 1 }}>
                    <DisplayResults editor={false} results={ourErrors} />
                </div>
            )}
        </div>
    )
}

function ConditionBody({
    classified,
    setUss,
    ...nodeProps
}: {
    classified: Condition
    setUss: (u: UrbanStatsASTExpression, o: ActionOptions) => void
} & NodeProps): ReactNode {
    switch (classified.kind) {
        case 'custom':
            return <CustomEditor uss={classified.expr} setUss={setUss} {...nodeProps} />
        case 'comparison':
            return <ComparisonEditor comparison={classified} setUss={setUss} {...nodeProps} />
        default:
            return <GroupEditor group={classified} setUss={setUss} {...nodeProps} />
    }
}

function ComparisonEditor({
    comparison,
    setUss,
    ...nodeProps
}: {
    comparison: Condition & { kind: 'comparison' }
    setUss: (u: UrbanStatsASTExpression, o: ActionOptions) => void
} & NodeProps): ReactNode {
    const { blockIdent } = nodeProps
    const { operator, lhs, rhs } = comparison
    const rebuild = (newOperator: ComparisonOperator, newLhs: UrbanStatsASTExpression, newRhs: UrbanStatsASTExpression): UrbanStatsASTExpression =>
        buildComparison(newOperator, newLhs, newRhs, blockIdent)

    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5em', width: '100%' }}>
            <AutoUXEditor
                uss={lhs}
                setUss={(newLhs, options) => { setUss(rebuild(operator, newLhs, rhs), options) }}
                type={comparisonLhsTypes}
                labelWidth="0px"
                {...nodeProps}
                blockIdent={extendBlockIdPositionalArg(blockIdent, 0)}
            />
            <div style={{ width: '4em', flexShrink: 0, display: 'flex', margin: '0.25em 0' }}>
                <BetterSelector<ComparisonOperator>
                    value={operator}
                    possibleValues={comparisonOperators}
                    renderValue={renderOperator}
                    onChange={(newOperator) => { setUss(rebuild(newOperator, lhs, rhs), {}) }}
                    inputStyle={{ textAlign: 'center' }}
                />
            </div>
            <AutoUXEditor
                uss={rhs}
                setUss={(newRhs, options) => { setUss(rebuild(operator, lhs, newRhs), options) }}
                type={comparisonRhsTypes}
                labelWidth="0px"
                {...nodeProps}
                blockIdent={extendBlockIdPositionalArg(blockIdent, 1)}
            />
        </div>
    )
}

function GroupEditor({
    group,
    setUss,
    ...nodeProps
}: {
    group: Condition & { kind: '&' | '|' }
    setUss: (u: UrbanStatsASTExpression, o: ActionOptions) => void
} & NodeProps): ReactNode {
    const { blockIdent, typeEnvironment } = nodeProps
    const operands = group.operands.map((expr, i) => ({ expr, blockIdent: extendBlockIdVectorElement(blockIdent, i) }))

    const setOperands = (newOperands: typeof operands, options: ActionOptions): void => {
        setUss(buildGroup(group.kind, newOperands, blockIdent), options)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em', width: '100%', paddingLeft: '1em' }}>
            {operands.map((operand, i) => (
                <ConditionNodeEditor
                    key={i}
                    uss={operand.expr}
                    setUss={(newOperand, options) => {
                        setOperands(operands.map((o, j) => j === i ? { ...o, expr: newOperand } : o), options)
                    }}
                    remove={() => { setOperands(operands.filter((_, j) => j !== i), {}) }}
                    {...nodeProps}
                    blockIdent={operand.blockIdent}
                />
            ))}
            <button
                data-test-id="test-add-condition-button"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => {
                    const newIdent = extendBlockIdVectorElement(blockIdent, operands.length)
                    setOperands([...operands, { expr: defaultComparison(newIdent, typeEnvironment), blockIdent: newIdent }], {})
                }}
            >
                + Add condition
            </button>
        </div>
    )
}
