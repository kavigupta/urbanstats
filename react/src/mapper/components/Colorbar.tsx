import React, { ReactNode, useMemo, useRef, useSyncExternalStore } from 'react'

import { Statistic } from '../../components/display-stats'
import { ScaleInstance } from '../../urban-stats-script/constants/scale'
import { furthestColor, interpolateColor } from '../../utils/color'
import { onWidthChange } from '../../utils/responsive'
import { UnitType } from '../../utils/unit'
import { Keypoints } from '../ramps'
import { Basemap } from '../settings/utils'

function colorbarStyleFromBasemap(basemap: Basemap): React.CSSProperties {
    switch (basemap.type) {
        case 'osm':
            return { }
        case 'none':
            return { backgroundColor: basemap.backgroundColor, color: basemap.textColor }
    }
}

interface EmpiricalRamp {
    ramp: Keypoints
    scale: ScaleInstance
    interpolations: number[]
    label: string
    unit?: UnitType
}

export type RampToDisplay = { type: 'ramp', value: EmpiricalRamp } | { type: 'label', value: string }

export function Colorbar(props: { ramp: RampToDisplay | undefined, basemap: Basemap }): ReactNode {
    // do this as a table with 10 columns, each 10% wide and
    // 2 rows. Top one is the colorbar, bottom one is the
    // labels.
    const valuesRef = useRef<HTMLDivElement>(null)
    const shouldRotate: boolean = useSyncExternalStore(onWidthChange, () => {
        if (valuesRef.current === null) {
            return false
        }
        const current = valuesRef.current
        const containers = current.querySelectorAll('.containerOfXticks')
        // eslint-disable-next-line @typescript-eslint/prefer-for-of -- this isn't a loop over an array
        for (let i = 0; i < containers.length; i++) {
            const container = containers[i] as HTMLDivElement
            const contained: HTMLDivElement | null = container.querySelector('.containedOfXticks')
            if (contained === null) {
                continue
            }
            if (contained.offsetWidth > container.offsetWidth * 0.9) {
                return true
            }
        }
        return false
    })

    const furthest = useMemo(() => props.ramp === undefined || props.ramp.type !== 'ramp' ? undefined : furthestColor(props.ramp.value.ramp.map(x => x[1])), [props.ramp])

    if (props.ramp === undefined) {
        return <div></div>
    }

    if (props.ramp.type === 'label') {
        return (
            <div className="centered_text" style={colorbarStyleFromBasemap(props.basemap)}>
                {props.ramp.value}
            </div>
        )
    }

    const ramp = props.ramp.value.ramp
    const scale = props.ramp.value.scale
    const label = props.ramp.value.label
    const values = props.ramp.value.interpolations
    const unit = props.ramp.value.unit
    const style = colorbarStyleFromBasemap(props.basemap)

    const createValue = (stat: number): ReactNode => {
        return (
            <div className="centered_text" style={style}>
                <Statistic
                    statname={label}
                    value={stat}
                    isUnit={false}
                    unit={unit}
                />
                <Statistic
                    statname={label}
                    value={stat}
                    isUnit={true}
                    unit={unit}
                />
            </div>
        )
    }

    const width = `${100 / values.length}%`

    const valuesDivs = (rotate: boolean): ReactNode[] => values.map((x, i) => (
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
        <div style={{ ...style, position: 'relative' }}>
            <div style={{ display: 'flex', width: '100%' }}>
                {
                    values.map((x, i) => (
                        <div
                            key={i}
                            style={{
                                width, height: '1em',
                                backgroundColor: interpolateColor(ramp, scale.forward(x), furthest),
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
            <div className="centered_text">
                {label}
            </div>
        </div>
    )
}
