import { IHistogram } from '../utils/protos'
import { formatToSignificantFigures, separateNumber } from '../utils/text'

export function approximateHistogramPercentile(histogram: IHistogram, percentile: number): number {
    if (percentile < 0 || percentile > 100) {
        throw new Error('Percentile must be between 0 and 100')
    }
    const counts = histogram.counts ?? []
    const total = counts.reduce((sum, count) => sum + count, 0)
    if (counts.length === 0 || total === 0) {
        return NaN
    }

    const target = percentile / 100 * total
    let cumulative = 0
    for (let i = 0; i < counts.length; i++) {
        const count = counts[i]
        const nextCumulative = cumulative + count
        if (target <= nextCumulative || i === counts.length - 1) {
            if (count === 0) {
                return i
            }
            const fraction = (target - cumulative) / count
            return i + Math.min(Math.max(fraction, 0), 1)
        }
        cumulative = nextCumulative
    }
    return counts.length - 1
}

export function renderHistogramValue(xidx: number, binSize: number, binMin: number, useImperial: boolean): string {
    const adjustment = useImperial ? Math.log10(1.60934) * 2 : 0
    return `${renderNumberHighlyRounded(Math.pow(10, xidx * binSize + binMin + adjustment), 2)}/${useImperial ? 'mi' : 'km'}²`
}

export function renderNumberHighlyRounded(x: number, places = 0): string {
    const rounded = formatToSignificantFigures(x, 3)
    return separateNumber(rounded)
}