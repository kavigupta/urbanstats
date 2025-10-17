import React, { CSSProperties, ReactNode, RefObject, useEffect, useRef } from 'react'
import { MapRef, useMap } from 'react-map-gl/maplibre'

import { CommonMaplibreMap, CustomAttributionControlComponent, insetBorderWidth } from '../../components/map-common'
import { mapBorderRadius, mapBorderWidth } from '../../components/screenshot'
import { useColors } from '../../page_template/colors'
import { Inset } from '../../urban-stats-script/constants/insets'
import { TestUtils } from '../../utils/TestUtils'

// eslint-disable-next-line no-restricted-syntax -- Forward Ref
function _InsetMap({ inset, children, editInset, container, i }: {
    inset: Inset
    children: ReactNode
    container: RefObject<HTMLDivElement>
    editInset?: {
        modify: (newInset: Partial<Inset>) => void
        duplicate: () => void
        delete: () => void
        add: () => void
    }
    i: number
}, ref: React.Ref<MapRef>): ReactNode {
    const colors = useColors()

    const id = `map-${i}`

    return (
        <div
            id={id}
            style={{ position: 'absolute',
                left: `${inset.bottomLeft[0] * 100}%`,
                bottom: `${inset.bottomLeft[1] * 100}%`,
                width: `${(inset.topRight[0] - inset.bottomLeft[0]) * 100}%`,
                height: `${(inset.topRight[1] - inset.bottomLeft[1]) * 100}%` }}
        >
            <CommonMaplibreMap
                ref={ref}
                style={{
                    position: 'absolute',
                    inset: 0,
                    border: !inset.mainMap ? `${insetBorderWidth}px solid ${colors.mapInsetBorderColor}` : `${mapBorderWidth}px solid ${colors.borderNonShadow}`,
                    borderRadius: !inset.mainMap ? '0px' : `${mapBorderRadius}px`,
                    width: undefined,
                    height: undefined,
                }}
                attributionControl={false}
            >
                {children}
                <HandleInsets
                    inset={inset}
                    setCoordBox={(newBox) => {
                        editInset?.modify({ coordBox: newBox })
                    }}
                />
                <ExposeMapForTesting id={id} />
                { inset.mainMap && <CustomAttributionControlComponent startShowingAttribution={true} />}
            </CommonMaplibreMap>
            { editInset && (
                <EditInsetsHandles
                    frame={[...inset.bottomLeft, ...inset.topRight]}
                    setFrame={(newFrame) => {
                        editInset.modify({ bottomLeft: [newFrame[0], newFrame[1]], topRight: [newFrame[2], newFrame[3]] })
                    }}
                    container={container}
                    delete={inset.mainMap ? undefined : editInset.delete}
                    duplicate={inset.mainMap ? undefined : editInset.duplicate}
                    add={inset.mainMap ? editInset.add : undefined}
                />
            )}
        </div>
    )
}

// eslint-disable-next-line no-restricted-syntax -- Forward Ref
export const InsetMap = React.forwardRef(_InsetMap)

function HandleInsets({ inset, setCoordBox }: { inset: Inset, setCoordBox: (newBox: Frame) => void }): ReactNode {
    const map = useMap().current!

    useEffect(() => {
        const fit = (): void => {
            map.fitBounds(inset.coordBox, { animate: false })
        }
        fit()
        map.on('resize', fit)
        return () => {
            map.off('resize', fit)
        }
    }, [inset, map])

    useEffect(() => {
        const getCoordBox = (): [number, number, number, number] => {
            const mapBounds = map.getBounds()
            const sw = mapBounds.getSouthWest()
            const ne = mapBounds.getNorthEast()
            return [sw.lng, sw.lat, ne.lng, ne.lat]
        }

        const moveHandler = (e: maplibregl.MapLibreEvent): void => {
            if (e.originalEvent === undefined) {
                // Not a user event
                return
            }
            setCoordBox(getCoordBox())
        }

        map.on('moveend', moveHandler)

        return () => {
            map.off('moveend', moveHandler)
        }
    }, [map, setCoordBox])

    return null
}

function ExposeMapForTesting({ id }: { id: string }): ReactNode {
    const map = useMap().current!.getMap()
    TestUtils.shared.maps.set(id, new WeakRef(map))
    return null
}

type DragKind = 'move' | `${'top' | 'bottom'}${'Right' | 'Left'}`

type Frame = [number, number, number, number]

function EditInsetsHandles(props: {
    frame: Frame
    setFrame: (newFrame: Frame) => void
    container: RefObject<HTMLDivElement>
    delete?: () => void
    duplicate?: () => void
    add?: () => void
}): ReactNode {
    const colors = useColors()

    const handleStyle: (handleSize: number) => CSSProperties = handleSize => ({
        backgroundColor: colors.slightlyDifferentBackground,
        border: `1px solid ${colors.textMain}`,
        position: 'absolute',
        width: `${handleSize}px`,
        height: `${handleSize}px`,
        borderRadius: '2px',
        zIndex: 1000,
    })

    const activeDrag = useRef<{ kind: DragKind, startX: number, startY: number, startFrame: Frame, pointerId: number } | undefined>(undefined)

    const pointerHandlers = (kind: DragKind): {
        'onPointerDown': (e: React.PointerEvent) => void
        'onPointerMove': (e: React.PointerEvent) => void
        'onPointerUp': (e: React.PointerEvent) => void
        'onPointerCancel': (e: React.PointerEvent) => void
        'data-test': string
    } => ({
        'data-test': kind,
        'onPointerDown': (e: React.PointerEvent) => {
            if (activeDrag.current !== undefined) {
                return
            }
            const thisElem = e.target as HTMLDivElement
            activeDrag.current = {
                kind,
                startX: e.clientX,
                startY: e.clientY,
                startFrame: props.frame,
                pointerId: e.pointerId,
            }
            thisElem.setPointerCapture(e.pointerId)
        },
        'onPointerMove': (e: React.PointerEvent) => {
            if (activeDrag.current?.pointerId !== e.pointerId) {
                return
            }
            const drag = activeDrag.current
            const rawMovementX = (e.clientX - drag.startX) / props.container.current!.clientWidth
            const rawMovementY = -(e.clientY - drag.startY) / props.container.current!.clientHeight
            const resizedFrame: Frame = [
                Math.max(0, Math.min(drag.startFrame[0] + rawMovementX, drag.startFrame[2] - 0.05)),
                Math.max(0, Math.min(drag.startFrame[1] + rawMovementY, drag.startFrame[3] - 0.1)),
                Math.max(drag.startFrame[0] + 0.05, Math.min(drag.startFrame[2] + rawMovementX, 1)),
                Math.max(drag.startFrame[1] + 0.1, Math.min(drag.startFrame[3] + rawMovementY, 1)),
            ]
            let newFrame: Frame
            switch (drag.kind) {
                case 'move':
                    const movementX = Math.max(0 - drag.startFrame[0], Math.min(rawMovementX, 1 - drag.startFrame[2]))
                    const movementY = Math.max(0 - drag.startFrame[1], Math.min(rawMovementY, 1 - drag.startFrame[3]))
                    newFrame = [drag.startFrame[0] + movementX, drag.startFrame[1] + movementY, drag.startFrame[2] + movementX, drag.startFrame[3] + movementY]
                    break
                case 'topRight':
                    newFrame = [drag.startFrame[0], drag.startFrame[1], resizedFrame[2], resizedFrame[3]]
                    break
                case 'bottomRight':
                    newFrame = [drag.startFrame[0], resizedFrame[1], resizedFrame[2], drag.startFrame[3]]
                    break
                case 'bottomLeft':
                    newFrame = [resizedFrame[0], resizedFrame[1], drag.startFrame[2], drag.startFrame[3]]
                    break
                case 'topLeft':
                    newFrame = [resizedFrame[0], drag.startFrame[1], drag.startFrame[2], resizedFrame[3]]
                    break
            }
            props.setFrame(newFrame)
        },
        'onPointerUp': (e: React.PointerEvent) => {
            if (activeDrag.current?.pointerId !== e.pointerId) {
                return
            }
            activeDrag.current = undefined
        },
        'onPointerCancel': (e: React.PointerEvent) => {
            if (activeDrag.current?.pointerId !== e.pointerId) {
                return
            }
            activeDrag.current = undefined
        },
    })

    return (
        <>
            <div style={{ ...handleStyle(15), right: `-${insetBorderWidth}px`, top: `-${insetBorderWidth}px`, cursor: 'nesw-resize' }} {...pointerHandlers('topRight')} />
            <div style={{ ...handleStyle(15), right: `-${insetBorderWidth}px`, bottom: `-${insetBorderWidth}px`, cursor: 'nwse-resize' }} {...pointerHandlers('bottomRight')} />
            <div style={{ ...handleStyle(15), left: `-${insetBorderWidth}px`, bottom: `-${insetBorderWidth}px`, cursor: 'nesw-resize' }} {...pointerHandlers('bottomLeft')} />
            <div style={{ ...handleStyle(15), left: `-${insetBorderWidth}px`, top: `-${insetBorderWidth}px`, cursor: 'nwse-resize' }} {...pointerHandlers('topLeft')} />
            <div style={{ ...handleStyle(20), margin: 'auto', left: `calc(50% - 10px)`, top: `calc(50% - 10px)`, cursor: 'move' }} {...pointerHandlers('move')} />
            {props.duplicate && (
                <div data-test="duplicate" style={{ ...handleStyle(25), margin: 'auto', left: `calc(66% - 12.5px)`, textAlign: 'center', lineHeight: '25px', top: -insetBorderWidth, cursor: 'copy' }} onClick={props.duplicate}>
                    <img src="/duplicate.png" alt="Duplicate" style={{ width: '100%', height: '100%' }} />
                </div>
            )}
            {props.delete && (
                <div data-test="delete" style={{ ...handleStyle(25), margin: 'auto', left: `calc(33% - 12.5px)`, textAlign: 'center', lineHeight: '25px', top: -insetBorderWidth, cursor: 'default' }} onClick={props.delete}>
                    <img src="/close-red-small.png" alt="Delete" style={{ width: '100%', height: '100%' }} />
                </div>
            )}
            {props.add && (
                <div data-test="add" style={{ ...handleStyle(25), margin: 'auto', left: `calc(50% - 12.5px)`, textAlign: 'center', top: -insetBorderWidth, cursor: 'default' }} onClick={props.add}>
                    <img src="/add-green-small.png" alt="Add" style={{ width: '100%', height: '100%' }} />
                </div>
            )}
        </>
    )
}
