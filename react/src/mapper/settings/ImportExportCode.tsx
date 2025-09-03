import { saveAs } from 'file-saver'
import React, { ReactNode } from 'react'
import { z } from 'zod'

import { convertToMapUss, mapperMetaFields } from '../../components/mapper-panel'
import { renderLocInfo } from '../../urban-stats-script/interpreter'
import { parse, unparse } from '../../urban-stats-script/parser'
import { cancelled, uploadFile } from '../../utils/upload'

import { defaultSettings, MapSettings } from './utils'

export function ImportExportCode({ mapSettings, setMapSettings }: { mapSettings: MapSettings, setMapSettings: (v: MapSettings) => void }): ReactNode {
    return (
        <div style={{
            display: 'flex',
            gap: '0.5em',
            margin: '0.5em 0',
        }}
        >
            <button onClick={async () => {
                const file = await uploadFile('.uss')

                if (file === cancelled) {
                    return
                }

                const importResult = importMapSettings(await file.text())

                if (!importResult.success) {
                    alert(importResult.error)
                    return
                }

                setMapSettings(importResult.mapSettings)
            }}
            >
                Import Script
            </button>
            <button onClick={() => {
                saveAs(new Blob([exportMapSettings(mapSettings)]), 'urban_stats_mapper.uss')
            }}
            >
                Export Script
            </button>
        </div>
    )
}

const metadataSchema = z.object({
    kind: z.literal('mapper'),
    ...mapperMetaFields,
})

function importMapSettings(fileContent: string): { success: true, mapSettings: MapSettings } | { success: false, error: string } {
    const parsed = parse(fileContent)
    if (parsed.type === 'error') {
        return {
            success: false,
            error: `Parse Errors:\n${parsed.errors.map(error => `• ${error.value} at ${renderLocInfo(error.location)}`).join('\n')}`,
        }
    }

    let metadata = undefined
    if (parsed.type === 'statements'
        && parsed.result[0].type === 'expression'
        && parsed.result[0].value.type === 'call'
        && parsed.result[0].value.fn.type === 'identifier'
        && parsed.result[0].value.fn.name.node === 'meta'
    ) {
        const meta = parsed.result[0].value

        // Remove meta from the parsed result
        parsed.result.splice(0, 1)

        const args = []

        for (const arg of meta.args) {
            if (arg.type === 'unnamed') {
                return { success: false, error: `"meta" function call at ${renderLocInfo(meta.entireLoc)} must have only named arguments` }
            }
            if (arg.value.type !== 'constant') {
                return { success: false, error: `"meta" function argument "${arg.name.node}" must have a constant value` }
            }
            args.push([arg.name.node, arg.value.value.node.value])
        }

        const metadataResult = metadataSchema.safeParse(Object.fromEntries(args))
        if (!metadataResult.success) {
            return {
                success: false,
                error: `Error parsing metadata: ${Object.values(metadataResult.error.flatten(issue => `• Parameter "${issue.path}" is ${issue.message}`).fieldErrors).join('\n')}`,
            }
        }
        metadata = metadataResult.data
    }

    const newSettings = defaultSettings({
        ...metadata,
        script: {
            uss: convertToMapUss(parsed),
        },
    })

    return { success: true, mapSettings: newSettings }
}

function exportMapSettings(mapSettings: MapSettings): string {
    return `meta(kind="mapper", universe="${mapSettings.universe}", geographyKind="${mapSettings.geographyKind}")\n${unparse(mapSettings.script.uss)}`
}
