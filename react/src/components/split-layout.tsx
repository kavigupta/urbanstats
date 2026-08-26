import React, { ComponentProps, MutableRefObject, ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { mixWithBackground } from '../utils/color'
import { useMobileLayout } from '../utils/responsive'

export function MaybeSplitLayout(props: { left: ReactNode, right: ReactNode, error: boolean }): ReactNode {
    const mobileLayout = useMobileLayout()

    return mobileLayout
        ? (
                <>
                    {props.left}
                    {props.right}
                </>
            )
        : <SplitLayout {...props} />
}

export function DivThatTakesUpTheRestOfThePage({ divRef, ...props }: ComponentProps<'div'> & { divRef?: MutableRefObject<HTMLDivElement | null> }): ReactNode {
    const [height, setHeight] = useState(0)
    const ref = useRef<HTMLDivElement | null>(null)

    const updateHeight = useCallback(() => {
        if (ref.current) {
            const bounds = ref.current.getBoundingClientRect()
            // window.innerHeight appears to be a mess on Android Chrome, so use the root element client height
            setHeight(document.documentElement.clientHeight - bounds.top - window.scrollY - 8)
        }
    }, [])

    // This is ultimately the simplest way to set the height
    useLayoutEffect(() => {
        updateHeight()
        window.addEventListener('resize', updateHeight)
        window.addEventListener('scroll', updateHeight)
        return () => {
            window.removeEventListener('resize', updateHeight)
            window.removeEventListener('scroll', updateHeight)
        }
    }, [updateHeight])

    return (
        <div
            {...props}
            style={{ height: `${height}px`, ...props.style }}
            ref={(thing) => {
                ref.current = thing
                if (divRef) {
                    divRef.current = thing
                }
            }}
        />
    )
}

function SplitLayout({ left, right, error }: { left: ReactNode, right: ReactNode, error: boolean }): ReactNode {
    const splitRef = useRef<HTMLDivElement>(null)
    const colors = useColors()

    const [leftColProp, setLeftColProp] = useSetting('mapperSettingsColumnProp')

    const [drag, setDrag] = useState<{ startOffsetX: number, pointerId: number, startProp: number } | undefined>(undefined)

    const dividerRef = useRef<HTMLDivElement>(null)

    const minLeftColProp = (): number =>
        minLeftWidth / splitRef.current!.offsetWidth

    useEffect(() => {
        if (dividerRef.current !== null) {
            dividerRef.current.style.cursor = leftColProp === minLeftColProp() ? 'e-resize' : (leftColProp === maxLeftColProp ? 'w-resize' : 'col-resize')
        }
    })

    const minLeftWidth = left ? 540 : 0
    const leftPct = left ? `${leftColProp * 100}%` : '0%'

    const maxLeftColProp = 0.5

    const dividerWidth = '1em'

    return (
        <DivThatTakesUpTheRestOfThePage style={{ display: 'flex', position: 'relative' }} divRef={splitRef}>
            {left && (
                <>
                    <div data-test="split-left" style={{ width: leftPct, minWidth: minLeftWidth, overflowY: 'scroll', backgroundColor: mixWithBackground(colors.hueColors.red, error ? 0.8 : 1, colors.slightlyDifferentBackground), padding: '1em', borderRadius: '5px' }}>
                        {left}
                    </div>
                    <div
                        ref={dividerRef}
                        style={{ width: dividerWidth, position: 'relative' }}
                        onPointerDown={(e) => {
                            if (drag === undefined) {
                                const div = e.target as HTMLDivElement
                                setDrag({
                                    pointerId: e.pointerId,
                                    startOffsetX: e.nativeEvent.offsetX + div.offsetLeft,
                                    startProp: Math.max(minLeftColProp(), leftColProp),
                                })
                                div.setPointerCapture(e.pointerId)
                            }
                        }}
                        onPointerMove={(e) => {
                            if (e.pointerId === drag?.pointerId) {
                                const div = e.target as HTMLDivElement
                                const propChange = (div.offsetLeft + e.nativeEvent.offsetX - drag.startOffsetX) / splitRef.current!.offsetWidth
                                setLeftColProp(Math.max(minLeftColProp(), Math.min(drag.startProp + propChange, maxLeftColProp)))
                            }
                        }}
                        onPointerCancel={(e) => {
                            if (drag?.pointerId === e.pointerId) {
                                setDrag(undefined)
                            }
                        }}
                        onPointerUp={(e) => {
                            if (drag?.pointerId === e.pointerId) {
                                setDrag(undefined)
                            }
                        }}
                    >
                        <div style={{
                            backgroundColor: colors.borderNonShadow,
                            borderRadius: '5px',
                            position: 'absolute',
                            width: '5px',
                            left: 'calc(50% - 2px)',
                            height: '50%',
                            top: '25%',
                            pointerEvents: 'none',
                        }}
                        />
                    </div>
                </>
            )}
            <div style={{ width: `calc(100% - max(${minLeftWidth}px, ${leftPct}) - ${dividerWidth})`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {right}
            </div>
        </DivThatTakesUpTheRestOfThePage>
    )
}
