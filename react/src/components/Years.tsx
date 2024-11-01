import React, { ReactNode } from 'react'

import { useAvailableYears } from '../page_template/statistic-settings'

import { CheckboxSetting } from './sidebar'

export function Years(): ReactNode {
    return useAvailableYears().map(year => <Year key={year} year={year} />)
}

function Year({ year }: { year: number }): ReactNode {
    return (
        <li>
            <CheckboxSetting
                name={year.toString()}
                setting_key={`show_stat_year_${year}`}
                testId={`year_${year}`}
            />
        </li>
    )
}
