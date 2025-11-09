import React, { HTMLAttributes, ReactNode, RefObject, useEffect, useRef, useState } from 'react'
import { MapRef, useMap } from 'react-map-gl/maplibre'

import { CommonMaplibreMap, CustomAttributionControlComponent, insetBorderWidth } from '../../components/map-common'
import { defaultMapBorderRadius, mapBorderWidth, useScreenshotMode } from '../../components/screenshot'
import { useColors } from '../../page_template/colors'
import { Inset } from '../../urban-stats-script/constants/insets'
import { TestUtils } from '../../utils/TestUtils'
import { Edit } from '../../utils/array-edits'

// eslint-disable-next-line no-restricted-syntax -- Forward Ref
function _InsetMap({ inset, children, editInset, container, i, numInsets }: {
    inset: Inset
    children: ReactNode
    container: RefObject<HTMLDivElement>
    editInset?: Edit<Inset>
    i: number
    numInsets: number
}, ref: React.Ref<MapRef>): ReactNode {
    const colors = useColors()

    const id = `map-${i}`

    const screenshotMode = useScreenshotMode()

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
                    borderRadius: !inset.mainMap || screenshotMode ? '0px' : `${defaultMapBorderRadius}px`,
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
                    shouldHaveCenterHandle={!inset.mainMap || !isFullScreenInset(inset)}
                    /*
                    Allowing reordering on the main map in case you want to put its corner in front of an inset or something
                    it also eliminates the weird edge case where the main map is not the 0th inset
                    */
                    moveUp={i + 1 < numInsets ? () => { editInset.moveUp() } : undefined}
                    moveDown={i > 0 ? () => { editInset.moveDown() } : undefined}
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

function isFullScreenInset(inset: Inset): boolean {
    const tolerance = 0.005
    return Math.abs(inset.bottomLeft[0] - 0) < tolerance
        && Math.abs(inset.bottomLeft[1] - 0) < tolerance
        && Math.abs(inset.topRight[0] - 1) < tolerance
        && Math.abs(inset.topRight[1] - 1) < tolerance
}

export function EditInsetsHandles(props: {
    frame: Frame
    setFrame?: (newFrame: Frame) => void
    container: RefObject<HTMLDivElement>
    delete?: () => void
    duplicate?: () => void
    add?: () => void
    moveUp?: () => void
    moveDown?: () => void
    shouldHaveCenterHandle: boolean
}): ReactNode {
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
            const containerBounds = props.container.current!.getBoundingClientRect()
            const rawMovementX = (e.clientX - drag.startX) / containerBounds.width
            const rawMovementY = -(e.clientY - drag.startY) / containerBounds.height
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
            props.setFrame!(newFrame)
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
            {props.setFrame && <Handle handleSize={15} style={{ right: `-${insetBorderWidth}px`, top: `-${insetBorderWidth}px`, cursor: 'nesw-resize' }} {...pointerHandlers('topRight')} />}
            {props.setFrame && <Handle handleSize={15} style={{ right: `-${insetBorderWidth}px`, bottom: `-${insetBorderWidth}px`, cursor: 'nwse-resize' }} {...pointerHandlers('bottomRight')} />}
            {props.setFrame && <Handle handleSize={15} style={{ left: `-${insetBorderWidth}px`, bottom: `-${insetBorderWidth}px`, cursor: 'nesw-resize' }} {...pointerHandlers('bottomLeft')} />}
            {props.setFrame && <Handle handleSize={15} style={{ left: `-${insetBorderWidth}px`, top: `-${insetBorderWidth}px`, cursor: 'nwse-resize' }} {...pointerHandlers('topLeft')} />}
            {props.setFrame && props.shouldHaveCenterHandle && (
                <Handle handleSize={20} style={{ margin: 'auto', left: `calc(50% - 10px)`, top: `calc(50% - 10px)`, cursor: 'move' }} {...pointerHandlers('move')} />
            )}
            {props.duplicate && (
                <Handle handleSize={25} data-test="duplicate" style={{ margin: 'auto', left: `calc(66% - 12.5px)`, textAlign: 'center', lineHeight: '25px', top: -insetBorderWidth, cursor: 'copy' }} onClick={props.duplicate} img={{ src: '/duplicate.png', alt: 'Duplicate' }} />
            )}
            {props.delete && (
                <Handle handleSize={25} data-test="delete" style={{ margin: 'auto', left: `calc(33% - 12.5px)`, textAlign: 'center', lineHeight: '25px', top: -insetBorderWidth, cursor: 'default' }} onClick={props.delete} img={{ src: '/close-red-small.png', alt: 'Delete' }} />
            )}
            {props.add && (
                <Handle handleSize={25} data-test="add" style={{ margin: 'auto', left: `calc(50% - 12.5px)`, textAlign: 'center', top: -insetBorderWidth, cursor: 'default' }} onClick={props.add} img={{ src: '/add-green-small.png', alt: 'Add' }} />
            )}
            {props.moveUp && (
                <Handle handleSize={25} data-test="moveUp" style={{ left: `-${insetBorderWidth}px`, textAlign: 'center', top: `calc(50% - 25px)`, cursor: 'default' }} onClick={props.moveUp} img={{ src: '/sort-up.png', alt: 'Move Up' }} />
            )}
            {props.moveDown && (
                <Handle handleSize={25} data-test="moveDown" style={{ left: `-${insetBorderWidth}px`, textAlign: 'center', top: `calc(50%)`, cursor: 'default' }} onClick={props.moveDown} img={{ src: '/sort-down.png', alt: 'Move Down' }} />
            )}
        </>
    )
}

function Handle({ handleSize, style, img, ...rest }: { handleSize: number, img?: { src: string, alt: string } } & HTMLAttributes<HTMLDivElement>): ReactNode {
    const colors = useColors()
    const [hover, setHover] = useState(false)

    const divRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleMouseEnter = (): void => {
            setHover(true)
        }

        const handleMouseLeave = (): void => {
            setHover(false)
        }

        const div = divRef.current!
        div.addEventListener('mouseenter', handleMouseEnter)
        div.addEventListener('mouseleave', handleMouseLeave)

        return () => {
            div.removeEventListener('mouseenter', handleMouseEnter)
            div.removeEventListener('mouseleave', handleMouseLeave)
        }
    }, [])

    return (
        <div
            ref={divRef}
            role="button"
            style={{
                backgroundColor: hover ? colors.slightlyDifferentBackgroundFocused : colors.slightlyDifferentBackground,
                border: `1px solid ${colors.textMain}`,
                position: 'absolute',
                width: `${handleSize}px`,
                height: `${handleSize}px`,
                borderRadius: '2px',
                ...style,
            }}
            {...rest}
        >
            {img && <img src={img.src} alt={img.alt} style={{ width: '100%', height: '100%' }} />}
        </div>
    )
}
