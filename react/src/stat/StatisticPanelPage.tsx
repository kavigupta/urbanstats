import React, { ReactNode, useMemo, useRef } from 'react'

import { generateStatisticsPanelCSVData } from '../components/csv-export'
import { createScreenshot } from '../components/screenshot'
import { GenericSearchBox } from '../components/search-generic'
import { defaultTypeEnvironment } from '../mapper/context'
import { RelativeLoader } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { useUniverse } from '../universe'
import { TypeEnvironment } from '../urban-stats-script/types-values'
import { assert } from '../utils/defensive'
import { sanitize } from '../utils/paths'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { displayType } from '../utils/text'

import { AddColumnSearchBox } from './AddColumnSearchBox'
import { StatData, Statistic, StatSetter, View } from './types'

export function StatisticPanelPage({ view, stat, data, set, loading }: {
    view: View
    stat: Statistic
    data?: StatData
    set: StatSetter
    loading: boolean
}): ReactNode {
    const colors = useColors()

    const headersRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)

    const subHeaderTextClass = useSubHeaderTextClass()

    const typeEnvironment = useMemo(() => defaultTypeEnvironment(stat.universe), [stat.universe])

    return (
        <PageTemplate
            screencap={data && ((universe, colors) => createScreenshot({
                path: `${sanitize(data.renderedStatname)}.png`,
                overallWidth: tableRef.current!.offsetWidth * 2,
                elementsToRender: [headersRef.current!, tableRef.current!],
            }, universe, colors))}
            csvExportCallback={data && (() => ({
                csvData: generateStatisticsPanelCSVData(data.articleNames, data.table, data.hideOrdinalsPercentiles),
                csvFilename: `${sanitize(data.renderedStatname)}.csv`,
            }))}
        >
            <div ref={headersRef} style={{ position: 'relative' }}>
                <StatisticPanelHead articleType={stat.articleType} universe={stat.universe} />
                <div className={subHeaderTextClass}>{data?.renderedStatname ?? 'Table'}</div>
                {!view.edit && (
                    <div style={{ marginLeft: 'auto', marginTop: '8px', display: 'flex', gap: '8px', width: 'fit-content' }}>
                        <AddColumnSearchBox stat={stat} set={set} typeEnvironment={typeEnvironment} />
                        <button
                            data-test-id="edit"
                            onClick={() => { set({ view: { ...view, edit: true } }, { push: true }) }}
                            style={{
                                padding: '0.25em 0.5em',
                                backgroundColor: colors.unselectedButton,
                                color: colors.textMain,
                                border: `1px solid ${colors.textMain}`,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                            }}
                        >
                            Filter / Edit Table
                        </button>
                        <ConvertToMapButton
                            editUSS={editUSS}
                            editGeographyKind={editGeographyKind}
                            editUniverse={editUniverse}
                        />
                    </div>
                )}
            </div>
            <div style={{ marginBlockEnd: '16px' }}></div>
            {preamble}
            {content}
        </PageTemplate>
    )
}

function StatisticPanelHead(props: { articleType: string, universe: string }): ReactNode {
    const headerTextClass = useHeaderTextClass()
    return (
        <div className={headerTextClass}>
            {displayType(props.universe, props.articleType)}
        </div>
    )
}
