
export { parse_ramp, RAMPS }

const RAMPS = {
    viridis: [
        [0, "#440154"], [0.1, "#482878"], [0.2, "#3e4989"], [0.3, "#31688e"],
        [0.4, "#26828e"], [0.5, "#1f9e89"], [0.6, "#35b779"], [0.7, "#6ece58"],
        [0.8, "#b5de2b"], [0.9, "#fde725"]
    ],
    magma: [
        [0, "#000004"], [0.1, "#140e36"], [0.2, "#3b0f70"], [0.3, "#641a80"],
        [0.4, "#8c2981"], [0.5, "#b73779"], [0.6, "#de4968"], [0.7, "#f7705c"],
        [0.8, "#fe9f6d"], [0.9, "#fecf92"]
    ],
    inferno: [
        [0, "#000004"], [0.1, "#160b39"], [0.2, "#420a68"], [0.3, "#6a176e"],
        [0.4, "#932667"], [0.5, "#bc3754"], [0.6, "#dd513a"], [0.7, "#f37819"],
        [0.8, "#fca50a"], [0.9, "#f6d746"]
    ],
    gray: [
        [0, "#000000"], [1, "#ffffff"]
    ],
}

class Ramp {
    create_ramp(values) {
        throw "create_ramp not implemented";
    }
}

function parse_colormap(cmap) {
    if (cmap.type === "none") {
        // default
        return RAMPS.viridis;
    } else if (cmap.type === "custom") {
        return JSON.parse(cmap.value);
    } else if (cmap.type === "preset") {
        return RAMPS[cmap.name];
    }
    throw new Error("Invalid colormap type");
}

function parse_ramp(ramp) {
    const cmap = parse_colormap(ramp.colormap);
    if (ramp.type === "constant") {
        return new ConstantRamp(cmap);
    } else if (ramp.type === "linear") {
        return new LinearRamp(cmap);
    }
    throw new Error("Invalid ramp type");
}

class ConstantRamp extends Ramp {
    constructor(kepoints) {
        super();
        this.values = kepoints;
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
