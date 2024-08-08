import { MathNumericType, Matrix, dotMultiply, lusolve, multiply, transpose } from "mathjs";
import { ColorStat, StatisticsForGeography } from "./settings";

export class Regression {
    constructor(
        readonly independent_fn: ColorStat, readonly dependent_fns: ColorStat[], readonly dependent_names: string[],
        readonly intercept_name: string, readonly residual_name: string,
        readonly weight_by_population: boolean, readonly population_idx: number
    ) {
    }

    compute(statistics_for_geography: StatisticsForGeography, variables: Record<string, number[]>) {
        let independent = this.independent_fn.compute(statistics_for_geography, variables);
        let dependent = this.dependent_fns.map((fn) => fn.compute(statistics_for_geography, variables));

        // independent: (N,)
        // dependent: (K, N)

        const y = independent.map(x => [x]);
        // transpose dependent
        const x = dependent[0].map((_, i) => dependent.map(row => row[i]));

        // x: (N, K)
        // y: (N, 1)

        // filter nans
        // is_nan: (N,)

        const is_nan = y.map((yi, i) => isNaN(yi[0]) || x[i].some(xij => isNaN(xij)));

        const xfilt = x.filter((_, i) => !is_nan[i]);
        const yfilt = y.filter((_, i) => !is_nan[i]);
        const sfg_filt = statistics_for_geography.filter((_, i) => !is_nan[i]);


        const Awofilt = x.map(row => [1, ...row]);
        const A = xfilt.map(row => [1, ...row]);
        var ATW = transpose(A);

        if (this.weight_by_population) {
            const W = sfg_filt.map(sfg => sfg.stats[this.population_idx]);
            ATW = dotMultiply(ATW, W);
        }

        const ata = multiply(ATW, A);

        const atb = multiply(ATW, yfilt);

        // solve for weights. weights = (ata)^-1 atb

        const ws_col = lusolve(ata, atb);
        const ws = ws_col.map(x => (x as MathNumericType[])[0]);

        const weights = ws.slice(1);
        const intercept = ws[0];

        const preds = multiply(Awofilt, ws_col).map(x => (x as number[])[0]);

        const result: Record<string, number[]> = {};
        for (let i = 0; i < this.dependent_names.length; i++) {
            if (this.dependent_names[i] == "") {
                continue;
            }
            result[this.dependent_names[i]] = preds.map(_ => weights[i] as number);
        }
        if (this.intercept_name != "") {
            result[this.intercept_name] = preds.map(_ => intercept as number);
        }

        if (this.residual_name != "") {
            result[this.residual_name] = preds.map((pred, i) => y[i][0] - pred);
        }

        return result;
    }
}