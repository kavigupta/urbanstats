import React, { ReactNode, useContext, useMemo } from 'react'

import { CountsByUT } from '../../components/countsByArticleType'
import { Navigator } from '../../navigation/Navigator'
import { withButtonRole } from '../../utils/a11y'
import { defaultTypeEnvironment } from '../context'
import { useMapGenerator } from '../map-generator'
import { EditMapperPanel } from '../settings/EditMapperPanel'
import { MapSettings, universesOf } from '../settings/utils'

export function MapperPanel(props: { mapSettings: MapSettings, view: boolean, counts: CountsByUT }): ReactNode {
    if (props.view) {
        return <DisplayMap mapSettings={props.mapSettings} />
    }

    return <EditMapperPanel {...props} />
}

function DisplayMap({ mapSettings }: { mapSettings: MapSettings }): ReactNode {
    const typeEnvironment = useMemo(() => defaultTypeEnvironment(universesOf(mapSettings.geographies)), [mapSettings.geographies])
    const mapGenerator = useMapGenerator({ mapSettings, typeEnvironment })

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            {mapGenerator.ui({ mode: 'view' }).node}
            <EditButton />
        </div>
    )
}

function EditButton(): ReactNode {
    const navigator = useContext(Navigator.Context)

    const currentDescriptor = navigator.usePageState().current.descriptor

    if (currentDescriptor.kind !== 'mapper') {
        return null
    }

    const link = navigator.link({ ...currentDescriptor, view: false }, { scroll: { kind: 'position', top: 0 } })

    return (
        <a
            {...link}
            {...withButtonRole('Edit', link.onClick)}
            style={{ position: 'absolute', left: '1em', top: '1em' }}
        >
            Edit
        </a>
    )
}
