import React, { ReactNode, createContext, useState } from 'react'

export interface ClusterScaleContextValue {
    globalMaxPieChartSize: number | undefined
    reportMax: (value: number) => void
}

// eslint-disable-next-line no-restricted-syntax -- Context Definition
export const ClusterScaleContext = createContext<ClusterScaleContextValue>({
    globalMaxPieChartSize: undefined,
    reportMax: () => undefined,
})

export function ClusterScaleProvider({ numInsets, children }: {
    numInsets: number
    children: (i: number) => ReactNode
}): ReactNode {
    const [clusterMaxByInset, setClusterMaxByInset] = useState<number[]>([])

    const setInsetMax = (insetIndex: number, maxValue: number): void => {
        setClusterMaxByInset((prev) => {
            if (prev.length !== numInsets) {
                const next = Array.from({ length: numInsets }, () => 0)
                next[insetIndex] = maxValue
                return next
            }
            if (prev[insetIndex] === maxValue) {
                return prev
            }
            const next = [...prev]
            next[insetIndex] = maxValue
            return next
        })
    }

    let globalMaxPieChartSize: number | undefined = Math.max(...clusterMaxByInset, 0)
    if (globalMaxPieChartSize === 0) {
        globalMaxPieChartSize = undefined
    }

    return (
        <>
            {Array.from({ length: numInsets }, (_, i) => (
                <ClusterScaleContext.Provider key={i} value={{ globalMaxPieChartSize, reportMax: (v) => { setInsetMax(i, v) } }}>
                    {children(i)}
                </ClusterScaleContext.Provider>
            ))}
        </>
    )
}
