import React, { ReactNode } from 'react'

import { CountsByUT } from '../../components/countsByArticleType'
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
    const mapGenerator = useMapGenerator({ mapSettings })
    return (
        <>
            {mapGenerator.generator.ui({ mode: 'view', loading: mapGenerator.loading }).node}
        </>
    )
}
