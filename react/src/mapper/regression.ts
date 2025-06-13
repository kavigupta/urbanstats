import assert from 'assert'

import { MathNumericType, Matrix, dotMultiply, lusolve, multiply, qr, transpose } from 'mathjs'

import { ColorStat, StatisticsForGeography } from './settings'

export class Regression {
    constructor(
        readonly independentFn: ColorStat, readonly dependentFns: ColorStat[], readonly dependentNames: string[],
        readonly interceptName: string, readonly residualName: string,
        readonly weightByPopulation: boolean, readonly populationIdx: number,
    ) {
    }

    compute(statistics_for_geography: StatisticsForGeography, variables: Record<string, number[]>): Record<string, number[]> {
        const independent = this.independentFn.compute(statistics_for_geography, variables)
        const dependent = this.dependentFns.map(fn => fn.compute(statistics_for_geography, variables))
        const w = this.weightByPopulation ? statistics_for_geography.map(sfg => sfg.stats[this.populationIdx]) : undefined
        const { residuals, weights, intercept } = calculateRegression(independent, dependent, w)

        const result: Record<string, number[]> = {}
        for (let i = 0; i < this.dependentNames.length; i++) {
            if (this.dependentNames[i] === '') {
                continue
            }
            result[this.dependentNames[i]] = residuals.map(() => weights[i])
        }
        if (this.interceptName !== '') {
            result[this.interceptName] = residuals.map(() => intercept)
        }

        if (this.residualName !== '') {
            result[this.residualName] = residuals
        }

        return result
    }
}

export function calculateRegression(independent: number[], dependent: number[][], w: number[] | undefined, noIntercept: boolean = false): {
    residuals: number[]
    weights: number[]
    intercept: number
} {
    // independent: (N,)
    // dependent: (K, N)

    assert (dependent.length !== 0, 'Must have at least one dependent variable')
    assert (dependent.every(row => row.length === independent.length), `Independent and dependent variables must have the same length: instead got independent: ${independent.length}, dependent: ${JSON.stringify(dependent.map(row => row.length))}`)
    const y = independent.map(x => [x])
    // transpose dependent
    const x = dependent[0].map((_, i) => dependent.map(row => row[i]))

    if (w === undefined) {
        w = Array(y.length).fill(1)
    }

    // x: (N, K)
    // y: (N, 1)
    // filter nans
    // is_nan: (N,)
    const isNan = y.map((yi, i) => isNaN(yi[0]) || x[i].some(xij => isNaN(xij)))

    const xfilt = x.filter((_, i) => !isNan[i])
    const yfilt = y.filter((_, i) => !isNan[i])
    w = w.filter((_, i) => !isNan[i])

    // eslint-disable-next-line no-restricted-syntax -- A is a matrix
    const A = noIntercept ? xfilt : xfilt.map(row => [1, ...row])

    // From Parth Nobel
    // Compute z = w^1/2 * y
    // Compute M = w^1/2 .* A
    // Compute Q, R = qr(M)
    // Compute x = R^{-1} Q^T b

    const z = yfilt.map((yi, i) => [Math.sqrt(w[i]) * yi[0]])

    console.log('z', z)
    console.log('A', A)

    // eslint-disable-next-line no-restricted-syntax -- M is a matrix
    const M = transpose(dotMultiply(transpose(A), w.map(wi => Math.sqrt(wi))))

    console.log('M', M)

    // eslint-disable-next-line no-restricted-syntax -- Q, R are matrices
    const { Q, R } = qr(M)

    console.log('Q', Q)
    console.log('R', R)

    // eslint-disable-next-line no-restricted-syntax -- QT is a matrix
    const QTb = dotMultiply(transpose(Q), z)

    console.log('QTb', QTb)

    const ws = lusolve(R as MathNumericType[][], QTb) as number[]

    console.log('ws', ws)

    const [weights, intercept] = noIntercept ? [ws, 0] : [ws.slice(1), ws[0]]

    const preds = multiply(A, ws).map(pred => pred)

    const residuals = preds.map((pred, i) => y[i][0] - pred)
    return { residuals, weights, intercept }
}

export function computePearsonR2(
    dependent: number[], residuals: number[], w: number[] | undefined,
): number {
    if (dependent.length !== residuals.length) {
        throw new Error(`Dependent and residuals must have the same length: ${dependent.length} vs ${residuals.length}`)
    }
    if (w !== undefined && w.length !== dependent.length) {
        throw new Error(`Weights must have the same length as dependent and residuals: ${w.length} vs ${dependent.length}`)
    }
    if (w === undefined) {
        w = Array(dependent.length).fill(1)
    }
    // https://en.wikipedia.org/wiki/Coefficient_of_determination
    // the most general definition of R^2 is:
    // R^2 = 1 - SS_res / SS_tot
    // where SS_res is the sum of squares of residuals and SS_tot is the total sum of squares
    // SS_res = sum(w_i * (y_i - y_pred_i)^2)
    // SS_tot = sum(w_i * (y_i - mean(y))^2)
    const totalWeight = w.reduce((sum, val) => sum + val, 0)
    const meanDependent = dependent.reduce((sum, val, i) => sum + w[i] * val, 0) / totalWeight

    const ssRes = w.reduce((sum, weight, i) => sum + weight * Math.pow(residuals[i], 2), 0)
    const ssTot = w.reduce((sum, weight, i) => sum + weight * Math.pow(dependent[i] - meanDependent, 2), 0)
    const r = 1 - ssRes / ssTot

    return r
}
