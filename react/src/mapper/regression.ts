import { MathNumericType, dotMultiply, lusolve, multiply, transpose } from 'mathjs'

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

        // independent: (N,)
        // dependent: (K, N)

        const y = independent.map(x => [x])
        // transpose dependent
        const x = dependent[0].map((_, i) => dependent.map(row => row[i]))

        // x: (N, K)
        // y: (N, 1)

        // filter nans
        // is_nan: (N,)

        const isNan = y.map((yi, i) => isNaN(yi[0]) || x[i].some(xij => isNaN(xij)))

        const xfilt = x.filter((_, i) => !isNan[i])
        const yfilt = y.filter((_, i) => !isNan[i])
        const sfgFilt = statistics_for_geography.filter((_, i) => !isNan[i])

        const awoFilt = x.map(row => [1, ...row])

        // eslint-disable-next-line no-restricted-syntax -- A is a matrix
        const A = xfilt.map(row => [1, ...row])
        // eslint-disable-next-line no-restricted-syntax -- ATW is a matrix
        let ATW = transpose(A)

        if (this.weightByPopulation) {
            // eslint-disable-next-line no-restricted-syntax -- W is a matrix
            const W = sfgFilt.map(sfg => sfg.stats[this.populationIdx])
            ATW = dotMultiply(ATW, W)
        }

        const ata = multiply(ATW, A)

        const atb = multiply(ATW, yfilt)

        // solve for weights. weights = (ata)^-1 atb

        const wsCol = lusolve(ata, atb)
        const ws = wsCol.map(col => (col as MathNumericType[])[0])

        const weights = ws.slice(1)
        const intercept = ws[0]

        const preds = multiply(awoFilt, wsCol).map(pred => (pred as number[])[0])

        const result: Record<string, number[]> = {}
        for (let i = 0; i < this.dependentNames.length; i++) {
            if (this.dependentNames[i] === '') {
                continue
            }
            result[this.dependentNames[i]] = preds.map(() => weights[i] as number)
        }
        if (this.interceptName !== '') {
            result[this.interceptName] = preds.map(() => intercept as number)
        }

        if (this.residualName !== '') {
            result[this.residualName] = preds.map((pred, i) => y[i][0] - pred)
        }

        return result
    }
}
