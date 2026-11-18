import { saveAs } from 'file-saver'
import React, { ReactNode } from 'react'
import { z } from 'zod'

import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { renderLocInfo } from '../../urban-stats-script/interpreter'
import { parse, unparse } from '../../urban-stats-script/parser'
import { cancelled, uploadFile } from '../../utils/upload'

import { ActionOptions } from './EditMapperPanel'
import { convertToMapUss } from './map-uss'
import { defaultSettings, mapperMetaFields, MapSettings } from './utils'

export function ImportExportCode({ mapSettings, setMapSettings }: { mapSettings: MapSettings, setMapSettings: (v: MapSettings, o: ActionOptions) => void }): ReactNode {
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

                setMapSettings(importResult.mapSettings, {})
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
    ...mapperMetaFields.shape,
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
            const value = metaArgValue(arg.value)
            if (value === undefined) {
                return { success: false, error: `"meta" function argument "${arg.name.node}" must have a constant value, or a list of them` }
            }
            args.push([arg.name.node, value.value])
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

/** A single geography stays a bare string, which is what every file written before lists existed has. */
function exportMapSettings(mapSettings: MapSettings): string {
    const field = (name: string, values: string[]): string =>
        values.length === 1 ? `${name}="${values[0]}"` : `${name}=[${values.map(value => `"${value}"`).join(', ')}]`
    const geographies = mapSettings.geographies
    return `meta(kind="mapper", ${field('universe', geographies.map(g => g.universe))}, ${field('geographyKind', geographies.map(g => g.geographyKind))})\n${unparse(mapSettings.script.uss)}`
}

function metaArgValue(expr: UrbanStatsASTExpression): { value: unknown } | undefined {
    if (expr.type === 'constant') {
        return { value: expr.value.node.value }
    }
    if (expr.type === 'vectorLiteral' && expr.elements.every(element => element.type === 'constant')) {
        return { value: expr.elements.map(element => element.value.node.value) }
    }
    return undefined
}
