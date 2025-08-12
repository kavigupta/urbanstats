import React, { ReactNode, useRef, useState } from 'react'
import { z } from 'zod'

import { useColors } from '../page_template/colors'

const dividerHeight = 10

export function HorizontalSplitPane(props: {
    top: ReactNode
    bottom: ReactNode
    persistentId: string
    minPropTop: number
    maxPropTop: number
    defaultPropTop: number
    height: string
    minTop: string
    minBottom: string
}): ReactNode {
    const topHeight = (prop: number, min: string, otherMin: string): string => `calc(clamp(${min}, ${prop * 100}% - (${dividerHeight}px / 2), 100% - ${dividerHeight}px - ${otherMin}))`

    const pointerDown = useRef<{ pointerId: number, pageX: number, pageY: number, startPropTop: number } | undefined>(undefined)

    const container = useRef<HTMLDivElement>(null)

    const localStorageKey = `HorizontalSplitPlane_${props.persistentId}`

    const [propTop, setPropTop] = useState<number>(() => z.coerce.number().nullable().parse(localStorage.getItem(localStorageKey)) ?? props.defaultPropTop)

    const colors = useColors()

    return (
        <div
            style={{ position: 'relative', height: props.height }}
            ref={container}
        >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topHeight(propTop, props.minTop, props.minBottom), overflowY: 'scroll' }}>
                {props.top}
            </div>
            <div
                style={{
                    cursor: 'ns-resize',
                    position: 'absolute',
                    height: dividerHeight,
                    left: 0,
                    right: 0,
                    top: topHeight(propTop, props.minTop, props.minBottom),
                }}
                onPointerDown={(e) => {
                    if (pointerDown.current === undefined) {
                        const height = container.current!.offsetHeight
                        const startPropTop = ((e.target as HTMLDivElement).offsetTop + (dividerHeight / 2)) / height
                        pointerDown.current = { pointerId: e.pointerId, pageX: e.pageX, pageY: e.pageY, startPropTop };
                        (e.target as Element).setPointerCapture(e.pointerId)

                        // Set prop top to current, as we could be constrained by layout
                        setPropTop(startPropTop)
                    }
                }}
                onPointerMove={(e) => {
                    if (e.pointerId === pointerDown.current?.pointerId) {
                        const height = container.current!.offsetHeight
                        const newPropTop = Math.max(props.minPropTop, Math.min(pointerDown.current.startPropTop + (e.pageY - pointerDown.current.pageY) / height, props.maxPropTop))
                        setPropTop(newPropTop)
                        localStorage.setItem(localStorageKey, newPropTop.toString())
                    }
                }}
                onPointerUp={(e) => {
                    if (e.pointerId === pointerDown.current?.pointerId) {
                        pointerDown.current = undefined
                    }
                }}
                onPointerCancel={(e) => {
                    if (e.pointerId === pointerDown.current?.pointerId) {
                        pointerDown.current = undefined
                    }
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: '3px',
                        bottom: '3px',
                        backgroundColor: colors.borderShadow,
                        borderRadius: '2px',
                        pointerEvents: 'none',
                    }}
                >

                </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: topHeight(1 - propTop, props.minBottom, props.minTop), overflowY: 'scroll' }}>
                {props.bottom}
            </div>
        </div>
    )
}
