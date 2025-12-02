import React, { ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { Statistic } from '../../components/display-stats'
import { Colors } from '../../page_template/color-themes'
import { useColors } from '../../page_template/colors'
import { ScaleInstance } from '../../urban-stats-script/constants/scale'
import { furthestColor, interpolateColor } from '../../utils/color'
import { UnitType } from '../../utils/unit'
import { Keypoints } from '../ramps'
import { Basemap } from '../settings/utils'

interface EmpiricalRamp {
    ramp: Keypoints
    scale: ScaleInstance
    interpolations: number[]
    label: string
    unit?: UnitType
}

export type RampToDisplay = { type: 'ramp', value: EmpiricalRamp } | { type: 'label', value: string }

export function styleFromBasemap(basemap: Basemap, colors: Colors): { backgroundColor: string, color?: string } {
    return basemap.type === 'none'
        ? { backgroundColor: basemap.backgroundColor, color: basemap.textColor }
        : { backgroundColor: colors.background }
}

export function Colorbar(props: { ramp: RampToDisplay | undefined, basemap: Basemap }): ReactNode {
    const colors = useColors()

    return (
        <div style={{
            width: '100%',
            ...styleFromBasemap(props.basemap, colors),
            padding: '10px',
        }}
        >
            {props.ramp && props.ramp.type === 'label' && (
                <div className="centered_text user_input">
                    {props.ramp.value}
                </div>
            )}
            {props.ramp && props.ramp.type === 'ramp' && (
                <RampColorbar ramp={props.ramp.value} />
            )}
        </div>
    )
}

function RampColorbar({ ramp }: { ramp: EmpiricalRamp }): ReactNode {
    // do this as a table with 10 columns, each 10% wide and
    // 2 rows. Top one is the colorbar, bottom one is the
    // labels.
    const valuesRef = useRef<HTMLDivElement>(null)

    const [shouldRotate, setShouldRotate] = useState(false)

    useLayoutEffect(() => {
        const values = valuesRef.current
        if (values === null) {
            return
        }
        const updateShouldRotate = (): void => {
            setShouldRotate(
                Array.from(values.querySelectorAll('.containerOfXticks')).some((container) => {
                    const contained: HTMLDivElement | null = container.querySelector('.containedOfXticks')
                    return contained !== null && contained.offsetWidth > (container as HTMLDivElement).offsetWidth * 0.9
                }),
            )
        }
        updateShouldRotate()
        const resizeObserver = new ResizeObserver(updateShouldRotate)
        resizeObserver.observe(values)
        return () => {
            resizeObserver.unobserve(values)
        }
    }, [ramp])

    const furthest = useMemo(() => furthestColor(ramp.ramp.map(x => x[1])), [ramp])

    const createValue = (stat: number): ReactNode => {
        return (
            <div className="centered_text">
                <Statistic
                    statname={ramp.label}
                    value={stat}
                    isUnit={false}
                    unit={ramp.unit}
                />
                <Statistic
                    statname={ramp.label}
                    value={stat}
                    isUnit={true}
                    unit={ramp.unit}
                />
            </div>
        )
    }

    const width = `${100 / ramp.interpolations.length}%`

    const valuesDivs = (rotate: boolean): ReactNode[] => ramp.interpolations.map((x, i) => (
        <div
            key={i}
            style={{
                width,
                // height: rotate ? '2em' : '1em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            className="containerOfXticks"
        >
            <div
                style={{
                    // transform: rotate ? 'rotate(-45deg)' : 'none',
                    writingMode: rotate ? 'sideways-lr' : 'horizontal-tb',
                    padding: rotate ? '0.5em' : '0',
                    // transformOrigin: 'center',
                    // whiteSpace: 'nowrap',
                    // fontSize: rotate ? '0.8em' : '1em',
                }}
                className="containedOfXticks"
            >
                {createValue(x)}
            </div>
        </div>
    ))

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', width: '100%' }}>
                {
                    ramp.interpolations.map((x, i) => (
                        <div
                            key={i}
                            style={{
                                width, height: '1em',
                                backgroundColor: interpolateColor(ramp.ramp, ramp.scale.forward(x), furthest),
                                marginLeft: '1px',
                                marginRight: '1px',
                            }}
                        >
                        </div>
                    ))
                }
            </div>
            <div ref={valuesRef} style={{ position: 'absolute', top: 0, left: 0, display: 'flex', width: '100%', visibility: 'hidden' }}>{valuesDivs(false)}</div>
            <div style={{ display: 'flex', width: '100%' }}>{valuesDivs(shouldRotate)}</div>
            <div className="centered_text user_input">
                {ramp.label}
            </div>
        </div>
    )
}
