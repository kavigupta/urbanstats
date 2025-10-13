import React, { ReactNode } from 'react'

import metadata from '../data/metadata'
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
    const sv = props.metaProto.stringValue
    assert(sv !== undefined && sv !== null, `ExternalLink: stringValue is undefined for metadata index ${props.meta.index}`)
    return (
        <a
            href={props.meta.link_prefix + computeLinkSuffix(props.meta.normalizer, sv)}
        >
            <img
                style={{ height: '24px', marginRight: '8px', verticalAlign: 'middle' }}
                src={imageURLFor(props.meta.site)}
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

function imageURLFor(site: ExternalLinkSpec['site']): string {
    switch (site) {
        case 'Wikipedia':
            return 'https://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo.png'
        case 'Wikidata':
            return 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Wikidata-logo.svg'
    }
}
