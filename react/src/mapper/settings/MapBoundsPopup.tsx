import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import React, { ReactNode, useRef, useEffect, useState, useCallback } from 'react'

import { useColors } from '../../page_template/colors'

export interface MapBounds {
    north: number
    south: number
    east: number
    west: number
}

interface MapBoundsPopupProps {
    isOpen: boolean
    onClose: () => void
    onDone: (bounds: MapBounds) => void
    currentBounds: MapBounds
    aspectRatio: number
}

export function MapBoundsPopup({ isOpen, onClose, onDone, currentBounds, aspectRatio }: MapBoundsPopupProps): ReactNode {
    const colors = useColors()
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const [isResizing, setIsResizing] = useState(false)
    const [resizeStartY, setResizeStartY] = useState(0)
    const [resizeStartHeight, setResizeStartHeight] = useState(0)
    const [pendingBounds, setPendingBounds] = useState<MapBounds>(currentBounds)
    const popupRef = useRef<HTMLDivElement>(null)

    // Update pendingBounds when currentBounds changes
    useEffect(() => {
        setPendingBounds(currentBounds)
    }, [currentBounds])

    const updateMapBounds = useCallback(() => {
        if (mapRef.current && popupRef.current) {
            const map = mapRef.current
            // Get the map container bounds
            const mapContainer = mapContainerRef.current
            if (mapContainer) {
                const mapRect = mapContainer.getBoundingClientRect()

                // Validate container dimensions
                if (mapRect.width <= 0 || mapRect.height <= 0 || !isFinite(mapRect.width) || !isFinite(mapRect.height)) {
                    return
                }

                // Convert screen coordinates to geographic coordinates
                const bounds = map.unproject([0, 0]) // Top-left corner
                const bounds2 = map.unproject([mapRect.width, mapRect.height]) // Bottom-right corner

                // Validate coordinates
                if (!isFinite(bounds.lat) || !isFinite(bounds.lng) || !isFinite(bounds2.lat) || !isFinite(bounds2.lng)) {
                    return
                }

                const mapBounds = {
                    north: Math.max(bounds.lat, bounds2.lat),
                    south: Math.min(bounds.lat, bounds2.lat),
                    east: Math.max(bounds.lng, bounds2.lng),
                    west: Math.min(bounds.lng, bounds2.lng),
                }

                setPendingBounds(mapBounds)
            }
        }
    }, [])

    // Initialize map when popup opens
    useEffect(() => {
        if (isOpen && mapContainerRef.current && !mapRef.current) {
            const map = new maplibregl.Map({
                container: mapContainerRef.current,
                style: 'https://tiles.openfreemap.org/styles/bright',
                center: [0, 0],
                zoom: 2,
                scrollZoom: true,
                dragPan: true,
                dragRotate: false,
                attributionControl: false,
            })

            // mapContainerRef.current.style.height = `${mapContainerRef.current.offsetWidth / aspectRatio}px`
            // console.log('mapContainerRef.current.style.height', mapContainerRef.current.style.height)

            mapRef.current = map

            // Wait for map to load
            map.on('load', () => {
                setPendingBounds(currentBounds)

                // Validate bounds before creating LngLatBounds
                if (isFinite(currentBounds.north) && isFinite(currentBounds.south)
                    && isFinite(currentBounds.east) && isFinite(currentBounds.west)) {
                    const bounds = new maplibregl.LngLatBounds(
                        [currentBounds.west, currentBounds.south],
                        [currentBounds.east, currentBounds.north],
                    )
                    map.fitBounds(bounds, { padding: 20 })
                }
            })

            // Update bounds when map moves (with a small delay to ensure container is ready)
            map.on('moveend', () => {
                setTimeout(updateMapBounds, 100)
            })
            map.on('zoomend', () => {
                setTimeout(updateMapBounds, 100)
            })
        }

        return () => {
            if (!isOpen && mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
            }
        }
    }, [isOpen, currentBounds, updateMapBounds])

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        setIsResizing(true)
        setResizeStartY(e.clientY)
        if (popupRef.current) {
            setResizeStartHeight(popupRef.current.offsetHeight)
        }
    }, [])

    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (isResizing && popupRef.current) {
            const deltaY = e.clientY - resizeStartY
            const newHeight = Math.max(300, resizeStartHeight + deltaY) // Minimum height of 300px

            // Validate height before applying
            if (isFinite(newHeight) && newHeight > 0) {
                popupRef.current.style.height = `${newHeight}px`
                // Delay updateMapBounds to ensure DOM has updated
                setTimeout(updateMapBounds, 50)
            }
        }
    }, [isResizing, resizeStartY, resizeStartHeight, updateMapBounds])

    const handleResizeEnd = useCallback(() => {
        setIsResizing(false)
    }, [])

    // Add global mouse event listeners for resizing
    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMove)
            document.addEventListener('mouseup', handleResizeEnd)
            return () => {
                document.removeEventListener('mousemove', handleResizeMove)
                document.removeEventListener('mouseup', handleResizeEnd)
            }
        }
        return undefined
    }, [isResizing, handleResizeMove, handleResizeEnd])

    const handleClear = useCallback(() => {
        // Create a default bounds object
        const defaultBounds = { north: 90, south: -90, east: 180, west: -180 }
        setPendingBounds(defaultBounds)
    }, [])

    const handleDone = useCallback(() => {
        onDone(pendingBounds)
    }, [pendingBounds, onDone])

    const formatBounds = (bounds: MapBounds | undefined): string => {
        if (!bounds || typeof bounds.north !== 'number' || typeof bounds.south !== 'number' || typeof bounds.east !== 'number' || typeof bounds.west !== 'number') {
            return 'No bounds selected'
        }
        return `N: ${bounds.north.toFixed(4)}, S: ${bounds.south.toFixed(4)}, E: ${bounds.east.toFixed(4)}, W: ${bounds.west.toFixed(4)}`
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: colors.slightlyDifferentBackground,
                    zIndex: 9999,
                }}
                onClick={onClose}
            />

            {/* Popup */}
            <div
                ref={popupRef}
                style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '600px',
                    height: '400px',
                    backgroundColor: colors.background,
                    border: `2px solid ${colors.borderNonShadow}`,
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    zIndex: 10000,
                    display: 'flex',
                    flexDirection: 'column',
                    resize: 'vertical',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        padding: '12px 16px',
                        borderBottom: `1px solid ${colors.borderNonShadow}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', color: colors.textMain }}>
                            Select Map Bounds
                        </h3>
                        <div style={{ fontSize: '12px', color: colors.ordinalTextColor, marginTop: '4px' }}>
                            Resize this window to adjust the map bounds
                            <span style={{ marginLeft: '8px' }}>
                                (Original aspect ratio:
                                {aspectRatio.toFixed(2)}
                                :1)
                            </span>
                        </div>
                        <div style={{ fontSize: '12px', color: colors.ordinalTextColor, marginTop: '4px' }}>
                            Pending:
                            {formatBounds(pendingBounds)}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: colors.textMain,
                            padding: '4px',
                        }}
                    >
                        ×
                    </button>
                </div>

                <div id="abc" style={{ flex: 1, position: 'relative', height: `${400 / aspectRatio}px`, width: '400px' }}>
                    <div
                        ref={mapContainerRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '0 0 8px 8px',
                        }}
                    />
                </div>

                <div
                    style={{
                        padding: '12px 16px',
                        borderTop: `1px solid ${colors.borderNonShadow}`,
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleClear}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: colors.slightlyDifferentBackground,
                                color: colors.textMain,
                                border: `1px solid ${colors.borderNonShadow}`,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Reset to World
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: colors.slightlyDifferentBackground,
                                color: colors.textMain,
                                border: `1px solid ${colors.borderNonShadow}`,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDone}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: colors.textMain,
                                color: colors.background,
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>

                {/* Resize handle */}
                <div
                    onMouseDown={handleResizeStart}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '8px',
                        cursor: 'ns-resize',
                        backgroundColor: 'transparent',
                        borderBottomLeftRadius: '8px',
                        borderBottomRightRadius: '8px',
                    }}
                />
            </div>
        </>
    )
}
