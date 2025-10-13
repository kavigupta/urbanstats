import React, { ReactNode } from 'react'

import metadata from '../data/metadata'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { assert } from '../utils/defensive'
import { IMetadata } from '../utils/protos'

type ExternalLinkSpec = (typeof metadata.external_link_metadata)[number]
type NormalizerSpec = ExternalLinkSpec['normalizer']

export function ExternalLinks(props: { metadataProtos: IMetadata[] }): ReactNode {
    const elementsEach = metadata.external_link_metadata.flatMap((meta) => {
        const foundMetadata = props.metadataProtos.find(m => m.metadataIndex === meta.index)
        if (foundMetadata === undefined) {
            return []
        }
        return [<ExternalLink key={meta.index} meta={meta} metaProto={foundMetadata} />]
    })

    return <>{elementsEach}</>
}

function ExternalLink(props: { meta: ExternalLinkSpec, metaProto: IMetadata }): ReactNode {
    const colors = useColors()
    const sv = props.metaProto.stringValue
    assert(sv !== undefined && sv !== null, `ExternalLink: stringValue is undefined for metadata index ${props.meta.index}`)
    return (
        <a
            href={props.meta.link_prefix + computeLinkSuffix(props.meta.normalizer, sv)}
        >
            <img
                style={{ height: '36px', marginRight: '8px', verticalAlign: 'middle' }}
                src={imageURLFor(props.meta.site, colors)}
            />
        </a>
    )
}

function computeLinkSuffix(normalizer: NormalizerSpec, sv: string): string {
    switch (normalizer) {
        case null:
            return sv
        case 'wikipedia':
            return sv.replace(/ /g, '_')
    }
}

function imageURLFor(site: ExternalLinkSpec['site'], colors: Colors): string {
    switch (site) {
        case 'Wikipedia':
            return '/wikipedia.svg'
        case 'Wikidata':
            return colors.wikidataURL
    }
}
