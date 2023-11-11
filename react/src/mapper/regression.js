export { Regression };

import MLR from 'ml-regression-multivariate-linear';

class Regression {
    constructor(independent_fn, dependent_fns, dependent_names, intercept_name, residual_name) {
        this.independent_fn = independent_fn;
        this.dependent_fns = dependent_fns;
        this.dependent_names = dependent_names;
        this.intercept_name = intercept_name;
        this.residual_name = residual_name;
    }

    compute(statistics_for_geography, variables) {
        let independent = this.independent_fn.compute(statistics_for_geography, variables);
        let dependent = this.dependent_fns.map((fn) => fn.compute(statistics_for_geography, variables));

        // independent: (N,)
        // dependent: (K, N)
        console.log(independent);
        console.log(dependent);

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

        var nj = require('numjs');

        const A = nj.array(xfilt.map(row => [1, ...row]));

        const ata = nj.dot(A.T, A);

        console.log("ata=", ata);

        const atb = nj.dot(A.T, yfilt);

        console.log("atb=", atb);

        const ws = nj.solve(ata, atb);

        console.log("weights=", ws);

        const mlr = new MLR(xfilt, yfilt);

        const weights = mlr.weights.slice(0, -1).map(x => x[0]);
        const intercept = mlr.weights[mlr.weights.length - 1][0];
        const preds = mlr.predict(x).map(x => x[0]);

        const result = {};
        for (let i = 0; i < this.dependent_names.length; i++) {
            if (this.dependent_names[i] == "") {
                continue;
            }
            result[this.dependent_names[i]] = preds.map(_ => ws[i]);
        }
        if (this.intercept_name != "") {
            result[this.intercept_name] = preds.map(_ => intercept);
        }

        if (this.residual_name != "") {
            result[this.residual_name] = preds.map((pred, i) => y[i][0] - pred);
        }

        console.log(result);

        return result;
    }
}