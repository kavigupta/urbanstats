import React, { HTMLAttributes, ReactNode, RefObject, useEffect, useRef, useState } from 'react'
import { MapRef, useMap } from 'react-map-gl/maplibre'

import { CommonMapProps, insetBorderWidth } from '../../components/map-common'
import { defaultMapBorderRadius, mapBorderWidth, useScreenshotMode } from '../../components/screenshot'
import { useColors } from '../../page_template/colors'
import { Frame, Inset, LaidOutSplit, SharedEdges, SplitDirection } from '../../urban-stats-script/constants/insets'
import { useMobileLayout } from '../../utils/responsive'
import { useElementSize } from '../../utils/useElementSize'
import { zIndex } from '../../utils/zIndex'

export interface InsetEditHandlers {
    setCoordBox: (coordBox: Frame) => void
    setFrame?: (frame: Frame) => void
    bounds: Frame
    delete?: () => void
    duplicate?: () => void
    add?: () => void
    moveUp?: () => void
    moveDown?: () => void
    split: (direction: SplitDirection) => void
}

interface InsetMapProps {
    inset: Inset & { sharedEdges?: SharedEdges }
    container: RefObject<HTMLDivElement>
    editInset?: InsetEditHandlers
    i: number
    numInsets: number
    interactive: boolean
}

function InsetMapImpl({ inset, children, editInset, container, i, interactive }: InsetMapProps & {
    children: (mapLibreProps: Partial<CommonMapProps>, mapChildren: ReactNode, subRef: React.Ref<MapRef>) => ReactNode
}, ref: React.Ref<MapRef>): ReactNode {
    const colors = useColors()

    const id = `map-${i}`

    const screenshotMode = useScreenshotMode()

    const mapChildren = (
        <HandleInsets
            inset={inset}
            setCoordBox={(newBox) => {
                editInset?.setCoordBox(newBox)
            }}
        />
    )

    const mapLibreProps: Partial<CommonMapProps> = {
        style: {
            position: 'absolute',
            inset: 0,
            border: !inset.mainMap ? `${insetBorderWidth}px solid ${colors.mapInsetBorderColor}` : `${mapBorderWidth}px solid ${colors.borderNonShadow}`,
            borderRadius: !inset.mainMap || screenshotMode ? '0px' : `${defaultMapBorderRadius}px`,
            width: undefined,
            height: undefined,
        },
        interactive,
        testId: id,
    }
    // Neighbours in a split overlap by a border so the divider is one border wide
    const shared = inset.sharedEdges ?? { left: false, right: false, top: false, bottom: false }
    const half = insetBorderWidth / 2
    const [left, right, top, bottom] = [shared.left, shared.right, shared.top, shared.bottom].map(e => e ? half : 0)

    return (
        <div
            id={id}
            style={{ position: 'absolute',
                left: `calc(${inset.bottomLeft[0] * 100}% - ${left}px)`,
                bottom: `calc(${inset.bottomLeft[1] * 100}% - ${bottom}px)`,
                width: `calc(${(inset.topRight[0] - inset.bottomLeft[0]) * 100}% + ${left + right}px)`,
                height: `calc(${(inset.topRight[1] - inset.bottomLeft[1]) * 100}% + ${top + bottom}px)` }}
        >
            {children(mapLibreProps, mapChildren, ref)}
            { editInset && <InsetEditControls inset={inset} editInset={editInset} container={container} /> }
        </div>
    )
}

// eslint-disable-next-line no-restricted-syntax -- Forward Ref
export const InsetMap = React.forwardRef(InsetMapImpl)

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

type DragKind = 'move' | `${'top' | 'bottom'}${'Right' | 'Left'}`

// Edit controls are bigger on mobile, where the canvas is scaled down to fit the screen
export function useMobileControlScale(): number {
    return useMobileLayout() ? 2 : 1
}

// Controls are this size at full scale, and shrink in insets too small to hold them
const controlSize = 25
const controlMargin = 6
const controlGap = 4
const minControlScale = 0.4
const fullScaleInset = { width: 160, height: 120 }

function InsetEditControls({ inset, editInset, container }: { inset: Inset, editInset: InsetEditHandlers, container: RefObject<HTMLDivElement> }): ReactNode {
    const frame: Frame = [...inset.bottomLeft, ...inset.topRight]
    const insetRef = useRef<HTMLDivElement>(null)
    const { width, height } = useElementSize(insetRef)
    const multiplier = useMobileControlScale()
    const scale = multiplier * Math.max(minControlScale, Math.min(1, width / (fullScaleInset.width * multiplier), height / (fullScaleInset.height * multiplier)))
    return (
        <>
            <div ref={insetRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
            <EditInsetsHandles
                frame={frame}
                setFrame={editInset.setFrame}
                bounds={editInset.bounds}
                container={container}
                shouldHaveCenterHandle={!inset.mainMap || !isFullScreen(frame)}
                scale={scale}
            />
            <InsetToolbar editInset={editInset} scale={scale} />
            <ReorderButtons moveUp={editInset.moveUp} moveDown={editInset.moveDown} scale={scale} />
        </>
    )
}

function isFullScreen(frame: Frame): boolean {
    const tolerance = 0.005
    return Math.abs(frame[0] - 0) < tolerance
        && Math.abs(frame[1] - 0) < tolerance
        && Math.abs(frame[2] - 1) < tolerance
        && Math.abs(frame[3] - 1) < tolerance
}

// Inside the frame, so the buttons of neighbouring insets in a split never overlap
function InsetToolbar({ editInset, scale }: { editInset: InsetEditHandlers, scale: number }): ReactNode {
    const size = controlSize * scale
    const button = { position: 'relative', cursor: 'default' } as const
    const split = editInset.split
    return (
        <div style={{ position: 'absolute', top: controlMargin * scale, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: controlGap * scale, pointerEvents: 'none' }}>
            {editInset.delete && <Handle handleSize={size} data-test="delete" style={button} onClick={editInset.delete} img={{ src: '/close-red-small.png', alt: 'Delete' }} />}
            {editInset.add && <Handle handleSize={size} data-test="add" style={button} onClick={editInset.add} img={{ src: '/add-green-small.png', alt: 'Add', padding: 0.06 }} />}
            {editInset.duplicate && <Handle handleSize={size} data-test="duplicate" style={{ ...button, cursor: 'copy' }} onClick={editInset.duplicate} img={{ src: '/duplicate.png', alt: 'Duplicate' }} />}
            <Handle handleSize={size} data-test="splitHorizontal" style={button} onClick={() => { split('horizontal') }}><SplitIcon direction="horizontal" /></Handle>
            <Handle handleSize={size} data-test="splitVertical" style={button} onClick={() => { split('vertical') }}><SplitIcon direction="vertical" /></Handle>
        </div>
    )
}

function ReorderButtons({ moveUp, moveDown, scale }: { moveUp?: () => void, moveDown?: () => void, scale: number }): ReactNode {
    const size = controlSize * scale
    const button = { position: 'relative', cursor: 'default' } as const
    return (
        <div style={{ position: 'absolute', left: controlMargin * scale, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: controlGap * scale, pointerEvents: 'none' }}>
            {moveUp && <Handle handleSize={size} data-test="moveUp" style={button} onClick={moveUp}><ArrowIcon direction="up" /></Handle>}
            {moveDown && <Handle handleSize={size} data-test="moveDown" style={button} onClick={moveDown}><ArrowIcon direction="down" /></Handle>}
        </div>
    )
}

type EditInsetsHandlesProps = Parameters<typeof EditInsetsHandles>[0]

export function EditInsetsHandles(props: {
    frame: Frame
    setFrame?: (newFrame: Frame) => void
    // Where the frame can be dragged, defaulting to the whole container
    bounds?: Frame
    container: RefObject<HTMLDivElement>
    delete?: () => void
    duplicate?: () => void
    add?: () => void
    moveUp?: () => void
    moveDown?: () => void
    shouldHaveCenterHandle: boolean
    scale: number
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
            const [west, south, east, north] = props.bounds ?? [0, 0, 1, 1]
            const resizedFrame: Frame = [
                Math.max(west, Math.min(drag.startFrame[0] + rawMovementX, drag.startFrame[2])),
                Math.max(south, Math.min(drag.startFrame[1] + rawMovementY, drag.startFrame[3])),
                Math.max(drag.startFrame[0], Math.min(drag.startFrame[2] + rawMovementX, east)),
                Math.max(drag.startFrame[1], Math.min(drag.startFrame[3] + rawMovementY, north)),
            ]
            let newFrame: Frame
            switch (drag.kind) {
                case 'move':
                    const movementX = Math.max(west - drag.startFrame[0], Math.min(rawMovementX, east - drag.startFrame[2]))
                    const movementY = Math.max(south - drag.startFrame[1], Math.min(rawMovementY, north - drag.startFrame[3]))
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

    const scale = props.scale

    return (
        <>
            {props.moveUp && (
                <Handle handleSize={controlSize * scale} data-test="moveUp" style={{ left: `-${insetBorderWidth}px`, textAlign: 'center', top: `calc(50% - ${controlSize * scale}px)`, cursor: 'default' }} onClick={props.moveUp} img={{ src: '/sort-up.png', alt: 'Move Up' }} />
            )}
            {props.moveDown && (
                <Handle handleSize={controlSize * scale} data-test="moveDown" style={{ left: `-${insetBorderWidth}px`, textAlign: 'center', top: `calc(50%)`, cursor: 'default' }} onClick={props.moveDown} img={{ src: '/sort-down.png', alt: 'Move Down' }} />
            )}
            {props.duplicate && (
                <Handle handleSize={controlSize * scale} data-test="duplicate" style={{ margin: 'auto', left: `calc(66% - ${controlSize / 2 * scale}px)`, textAlign: 'center', lineHeight: `${controlSize * scale}px`, top: -insetBorderWidth, cursor: 'copy' }} onClick={props.duplicate} img={{ src: '/duplicate.png', alt: 'Duplicate' }} />
            )}
            {props.delete && (
                <Handle handleSize={controlSize * scale} data-test="delete" style={{ margin: 'auto', left: `calc(33% - ${controlSize / 2 * scale}px)`, textAlign: 'center', lineHeight: `${controlSize * scale}px`, top: -insetBorderWidth, cursor: 'default' }} onClick={props.delete} img={{ src: '/close-red-small.png', alt: 'Delete' }} />
            )}
            {props.add && (
                <Handle handleSize={controlSize * scale} data-test="add" style={{ margin: 'auto', left: `calc(50% - ${controlSize / 2 * scale}px)`, textAlign: 'center', top: -insetBorderWidth, cursor: 'default' }} onClick={props.add} img={{ src: '/add-green-small.png', alt: 'Add' }} />
            )}
            {props.setFrame && <Handle handleSize={15 * scale} style={{ right: `-${insetBorderWidth}px`, top: `-${insetBorderWidth}px`, cursor: 'nesw-resize' }} {...pointerHandlers('topRight')} />}
            {props.setFrame && <Handle handleSize={15 * scale} style={{ right: `-${insetBorderWidth}px`, bottom: `-${insetBorderWidth}px`, cursor: 'nwse-resize' }} {...pointerHandlers('bottomRight')} />}
            {props.setFrame && <Handle handleSize={15 * scale} style={{ left: `-${insetBorderWidth}px`, bottom: `-${insetBorderWidth}px`, cursor: 'nesw-resize' }} {...pointerHandlers('bottomLeft')} />}
            {props.setFrame && <Handle handleSize={15 * scale} style={{ left: `-${insetBorderWidth}px`, top: `-${insetBorderWidth}px`, cursor: 'nwse-resize' }} {...pointerHandlers('topLeft')} />}
            {props.setFrame && props.shouldHaveCenterHandle && (
                <Handle handleSize={20 * scale} style={{ margin: 'auto', left: `calc(50% - ${10 * scale}px)`, top: `calc(50% - ${10 * scale}px)`, cursor: 'move' }} {...pointerHandlers('move')} />
            )}
        </>
    )
}

function ArrowIcon({ direction }: { direction: 'up' | 'down' }): ReactNode {
    const colors = useColors()
    return (
        <svg viewBox="0 0 10 10" style={{ width: '100%', height: '100%', display: 'block' }}>
            <title>{direction === 'up' ? 'Move Up' : 'Move Down'}</title>
            <polygon points={direction === 'up' ? '1.5,7.5 5,2.5 8.5,7.5' : '1.5,2.5 5,7.5 8.5,2.5'} fill={colors.brandingColor} />
        </svg>
    )
}

function SplitIcon({ direction }: { direction: SplitDirection }): ReactNode {
    const colors = useColors()
    const pane = (x: number, y: number, width: number, height: number): ReactNode => <rect x={x} y={y} width={width} height={height} rx={1} fill={colors.brandingColor} />
    return (
        <svg viewBox="0 0 10 10" style={{ width: '100%', height: '100%', display: 'block' }}>
            <title>{direction === 'horizontal' ? 'Split Horizontally' : 'Split Vertically'}</title>
            {direction === 'horizontal'
                ? (
                        <>
                            {pane(1.5, 1.5, 3, 7)}
                            {pane(5.5, 1.5, 3, 7)}
                        </>
                    )
                : (
                        <>
                            {pane(1.5, 1.5, 7, 3)}
                            {pane(1.5, 5.5, 7, 3)}
                        </>
                    )}
        </svg>
    )
}

function Handle({ handleSize, style, img, children, ...rest }: { handleSize: number, img?: { src: string, alt: string, padding?: number } } & HTMLAttributes<HTMLDivElement>): ReactNode {
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
                borderRadius: handleSize * 0.25,
                overflow: 'hidden',
                touchAction: 'none',
                pointerEvents: 'auto',
                zIndex: zIndex.insetEditHandle,
                ...style,
            }}
            {...rest}
        >
            {img && <img src={img.src} alt={img.alt} style={{ width: '100%', height: '100%', display: 'block', boxSizing: 'border-box', padding: `${(img.padding ?? 0) * 100}%` }} />}
            {children}
        </div>
    )
}

export function SplitFrameHandles({ frame, container, handlers: { moveUp, moveDown, ...handlers } }: { frame: Frame, container: RefObject<HTMLDivElement>, handlers: Omit<EditInsetsHandlesProps, 'frame' | 'container' | 'shouldHaveCenterHandle' | 'scale'> }): ReactNode {
    const scale = useMobileControlScale()
    return (
        <div
            style={{
                position: 'absolute',
                pointerEvents: 'none',
                left: `${frame[0] * 100}%`,
                bottom: `${frame[1] * 100}%`,
                width: `${(frame[2] - frame[0]) * 100}%`,
                height: `${(frame[3] - frame[1]) * 100}%`,
            }}
        >
            <EditInsetsHandles frame={frame} container={container} shouldHaveCenterHandle={!isFullScreen(frame)} scale={scale} {...handlers} />
            <ReorderButtons moveUp={moveUp} moveDown={moveDown} scale={scale} />
        </div>
    )
}

export function SplitDivider({ split: { split, cells }, j, container, setProportions }: {
    split: LaidOutSplit
    j: number
    container: RefObject<HTMLDivElement>
    setProportions: (proportions: number[]) => void
}): ReactNode {
    const colors = useColors()
    const activePointer = useRef<number | undefined>(undefined)

    const horizontal = split.direction === 'horizontal'
    const before = cells[j]
    const after = cells[j + 1]
    // Extent of the two cells along the split axis
    const [lo, hi] = horizontal ? [before[0], after[2]] : [after[1], before[3]]
    const mobileMultiplier = useMobileControlScale()
    const thickness = 12 * mobileMultiplier
    const [hover, setHover] = useState(false)

    return (
        <div
            data-test="splitDivider"
            onPointerEnter={() => { setHover(true) }}
            onPointerLeave={() => { setHover(false) }}
            style={{
                position: 'absolute',
                pointerEvents: 'auto',
                touchAction: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...(horizontal
                    ? { left: `calc(${before[2] * 100}% - ${thickness / 2}px)`, bottom: `${before[1] * 100}%`, height: `${(before[3] - before[1]) * 100}%`, width: thickness, cursor: 'col-resize' }
                    : { bottom: `calc(${before[1] * 100}% - ${thickness / 2}px)`, left: `${before[0] * 100}%`, width: `${(before[2] - before[0]) * 100}%`, height: thickness, cursor: 'row-resize' }),
            }}
            onPointerDown={(e) => {
                if (activePointer.current !== undefined) {
                    return
                }
                activePointer.current = e.pointerId
                e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
                if (activePointer.current !== e.pointerId) {
                    return
                }
                const bounds = container.current!.getBoundingClientRect()
                const position = horizontal
                    ? (e.clientX - bounds.left) / bounds.width
                    : 1 - (e.clientY - bounds.top) / bounds.height
                // Less for cells too small to keep 0.02 each, so both shares stay positive
                const minSize = Math.min(0.02, (hi - lo) / 4)
                const clamped = Math.max(lo + minSize, Math.min(hi - minSize, position))
                const firstShare = horizontal ? (clamped - lo) / (hi - lo) : (hi - clamped) / (hi - lo)
                const pair = split.children[j].proportion + split.children[j + 1].proportion
                const proportions = split.children.map(({ proportion }) => proportion)
                proportions[j] = pair * firstShare
                proportions[j + 1] = pair * (1 - firstShare)
                setProportions(proportions)
            }}
            onPointerUp={(e) => {
                if (activePointer.current === e.pointerId) {
                    activePointer.current = undefined
                }
            }}
            onPointerCancel={(e) => {
                if (activePointer.current === e.pointerId) {
                    activePointer.current = undefined
                }
            }}
        >
            <div style={{
                backgroundColor: colors.slightlyDifferentBackground,
                border: `1px solid ${colors.textMain}`,
                borderRadius: 4 * mobileMultiplier,
                width: horizontal ? (hover ? 8 : 6) * mobileMultiplier : (hover ? 48 : 32) * mobileMultiplier,
                height: horizontal ? (hover ? 48 : 32) * mobileMultiplier : (hover ? 8 : 6) * mobileMultiplier,
            }}
            />
        </div>
    )
}
