import React, { ReactNode, useState, useCallback } from 'react'

import { useColors } from '../../page_template/colors'
import { UrbanStatsASTExpression, locationOf } from '../../urban-stats-script/ast'
import { parseNoErrorAsExpression } from '../../urban-stats-script/parser'
import { USSDocumentedType, USSType } from '../../urban-stats-script/types-values'
import { computeAspectRatio } from '../../utils/coordinates'
import { assert } from '../../utils/defensive'

import { parseExpr } from './AutoUXEditor'
import { MapBoundsPopup, MapBounds } from './MapBoundsPopup'

interface MapBoundsSelectorProps {
    uss: UrbanStatsASTExpression
    setUss: (u: UrbanStatsASTExpression) => void
    blockIdent: string
    type: USSType[]
    typeEnvironment: Map<string, USSDocumentedType>
}

function extractNumber(expr: [string, UrbanStatsASTExpression] | undefined): number | undefined {
    if (expr === undefined) {
        return undefined
    }
    if (expr[1].type !== 'constant') {
        return undefined
    }
    const value = expr[1].value.node
    if (value.type !== 'number') {
        return undefined
    }
    return value.value
}

// Extract bounds from USS expression
function extractBoundsFromUSS(uss: UrbanStatsASTExpression): MapBounds | undefined {
    if (uss.type !== 'objectLiteral') {
        return undefined
    }
    const properties = uss.properties

    const extract = (key: string): number | undefined => extractNumber(properties.find(([k]) => k === key))

    const north = extract('north')
    const south = extract('south')
    const east = extract('east')
    const west = extract('west')

    if (north === undefined || south === undefined || east === undefined || west === undefined) {
        return undefined
    }

    return { north, south, east, west }
}

export function MapBoundsSelector({ uss, setUss, blockIdent, type, typeEnvironment }: MapBoundsSelectorProps): ReactNode {
    const colors = useColors()
    const [isOpen, setIsOpen] = useState(false)

    // Extract current bounds from USS expression
    const currentBounds = extractBoundsFromUSS(uss)

    // Default bounds and aspect ratio
    const defaultBounds = { north: 90, south: -90, east: 180, west: -180 }

    // Use current bounds if available, otherwise use defaults
    const bounds = currentBounds ?? defaultBounds
    const aspectRatio = computeAspectRatio([bounds.west, bounds.south, bounds.east, bounds.north])

    console.log('aspectRatio', aspectRatio, bounds)

    assert(!isNaN(aspectRatio), `Aspect ratio is NaN for bounds: ${JSON.stringify(bounds)}`)

    const updateUSSWithBounds = useCallback((newBounds: MapBounds) => {
        // Create a new USS expression with the bounds
        const boundsExpression = `{ north: ${newBounds.north}, south: ${newBounds.south}, east: ${newBounds.east}, west: ${newBounds.west} }`

        // Since we only show MapBoundsSelector for object literals, use the object's block identifier
        const ussLocation = locationOf(uss)
        const ussBlockIdent = ussLocation.start.block.type === 'single' ? ussLocation.start.block.ident : blockIdent
        let newUss = parseNoErrorAsExpression(boundsExpression, ussBlockIdent)
        newUss = parseExpr(
            newUss,
            blockIdent,
            type,
            typeEnvironment,
            () => { throw new Error('Should not happen') },
            true,
        )
        setUss(newUss)
    }, [uss, blockIdent, setUss, type, typeEnvironment])

    const handleOpen = useCallback(() => {
        setIsOpen(true)
    }, [])

    const handleClose = useCallback(() => {
        setIsOpen(false)
    }, [])

    const handleDone = useCallback((newBounds: MapBounds) => {
        updateUSSWithBounds(newBounds)
        setIsOpen(false)
    }, [updateUSSWithBounds])

    return (
        <div style={{ position: 'relative' }}>
            <button
                style={{
                    padding: '6px 12px',
                    border: `1px solid ${colors.borderNonShadow}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    backgroundColor: colors.slightlyDifferentBackground,
                    color: colors.textMain,
                    minHeight: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                }}
                onClick={handleOpen}
                title="Select map bounds visually"
            >
                🗺️ Select Bounds
            </button>

            <MapBoundsPopup
                isOpen={isOpen}
                onClose={handleClose}
                onDone={handleDone}
                currentBounds={bounds}
                aspectRatio={aspectRatio}
            />
        </div>
    )
}
