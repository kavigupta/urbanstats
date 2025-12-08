import React, { ReactNode } from 'react'

import { useAvailableYears } from '../page_template/statistic-settings'
import { Year } from '../page_template/statistic-tree'

import { CheckboxSetting } from './sidebar'

export function Years({ fontSize }: { fontSize: string }): ReactNode {
    return useAvailableYears().map(year => <YearCheckbox key={year} year={year} fontSize={fontSize} />)
}

function YearCheckbox({ year, fontSize }: { year: Year, fontSize: string }): ReactNode {
    return (
        <li>
            <CheckboxSetting
                name={year.toString()}
                settingKey={`show_stat_year_${year}`}
                testId={`year_${year}`}
                fontSize={fontSize}
            />
        </li>
    )
}
