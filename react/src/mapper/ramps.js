
export { parse_ramp, RAMPS }

const RAMPS = require("../data/mapper/ramps.json");
class Ramp {
    create_ramp(values) {
        throw "create_ramp not implemented";
    }
}

function parse_colormap(cmap) {
    console.log("C", cmap)
    if (cmap.type === "none") {
        // default
        return RAMPS.Gray;
    } else if (cmap.type === "custom") {
        try {
            console.log("V", cmap.custom_colormap)
            const result = JSON.parse(cmap.custom_colormap);
            console.log(result);
            if (result instanceof Array
                && result.every(x => x instanceof Array
                    && x.length === 2
                    && typeof x[0] === "number"
                    && typeof x[1] === "string"
                    && x[1].match(/^#[0-9a-f]{6}$/i) !== null
                )) {
                return result;
            }
        } catch (e) {
        }
        return RAMPS.Gray;
    } else if (cmap.type === "preset") {
        if (cmap.name == "") {
            return RAMPS.Gray;
        }
        return RAMPS[cmap.name];
    }
    throw new Error("Invalid colormap type");
}

function parse_ramp(ramp) {
    const cmap = parse_colormap(ramp.colormap);
    if (ramp.type === "constant") {
        return new ConstantRamp(cmap,
            ramp.lower_bound === undefined || ramp.lower_bound === "" ? 0 : parseFloat(ramp.lower_bound),
            ramp.upper_bound === undefined || ramp.upper_bound === "" ? 1 : parseFloat(ramp.upper_bound),
        );
    } else if (ramp.type === "linear") {
        return new LinearRamp(cmap);
    }
    throw new Error("Invalid ramp type");
}

class ConstantRamp extends Ramp {
    constructor(kepoints, a, b) {
        super();
        console.log(a, b);
        console.log(kepoints);
        const a0 = kepoints[0][0];
        const b0 = kepoints[kepoints.length - 1][0];
        this.values = kepoints.map(([value, color]) => {
            const new_value = (value - a0) / (b0 - a0) * (b - a) + a;
            return [new_value, color];
        });
        console.log(this.values)
    }

    create_ramp(values) {
        return [this.values, linear_values(this.values[0][0], this.values[this.values.length - 1][0])];
    }
}

class LinearRamp extends Ramp {
    constructor(keypoints) {
        super();
        this.values = keypoints;
    }

    create_ramp(values) {
        values = values.filter(x => !isNaN(x));
        const minimum = Math.min(...values);
        const maximum = Math.max(...values);
        const range = maximum - minimum;
        const ramp_min = Math.min(...this.values.map(([value, color]) => value));
        const ramp_max = Math.max(...this.values.map(([value, color]) => value));
        const ramp_range = ramp_max - ramp_min;
        const ramp = this.values.map(x => [x[0], x[1]]);
        for (let i in ramp) {
            ramp[i][0] = (ramp[i][0] - ramp_min) / ramp_range * range + minimum;
        }
        return [ramp, linear_values(minimum, maximum)];
    }
}

function linear_values(minimum, maximum) {
    const steps = 10;
    const range = maximum - minimum;
    const values = Array(steps).fill(0).map((_, i) => minimum + range * i / (steps - 1));
    return values;
}
