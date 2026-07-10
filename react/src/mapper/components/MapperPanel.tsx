import React, { ReactNode, useMemo } from 'react'

import { CountsByUT } from '../../components/countsByArticleType'
import { defaultTypeEnvironment } from '../context'
import { useMapGenerator } from '../map-generator'
import { EditMapperPanel } from '../settings/EditMapperPanel'
import { MapSettings } from '../settings/utils'

export function MapperPanel(props: { mapSettings: MapSettings, view: boolean, counts: CountsByUT }): ReactNode {
    if (props.view) {
        return <DisplayMap mapSettings={props.mapSettings} />
    }

    return <EditMapperPanel {...props} />
}

function DisplayMap({ mapSettings }: { mapSettings: MapSettings }): ReactNode {
    const typeEnvironment = useMemo(() => defaultTypeEnvironment(mapSettings.universe), [mapSettings.universe])
    const mapGenerator = useMapGenerator({ mapSettings, typeEnvironment })
    return (
        <>
            {mapGenerator.ui({ mode: 'view' }).node}
        </>
    )
}
