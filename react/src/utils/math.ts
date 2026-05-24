export function firstNonNan(numbers: number[]): number {
    for (const num of numbers) {
        if (!isNaN(num)) {
            return num
        }
    }
    return NaN
}

// Source: https://gist.github.com/Yaffle/4654250
// Math.nextUp
// Note:
// Math.nextDown = function (x) { return -Math.nextUp(-x); };
// Math.nextAfter = function (x, y) { return y < x ? -Math.nextUp(-x) : (y > x ? Math.nextUp(x) : (x !== x ? x : y)); };

const epsilon = Math.pow(2, -52)
const maxValue = (2 - epsilon) * Math.pow(2, 1023)
const minValue = Math.pow(2, -1022)

function nextUp(x: number): number {
    if (x !== x) {
        return x
    }
    if (x === -1 / 0) {
        return -maxValue
    }
    if (x === +1 / 0) {
        return +1 / 0
    }
    if (x === +maxValue) {
        return +1 / 0
    }
    let y = x * (x < 0 ? 1 - epsilon / 2 : 1 + epsilon)
    if (y === x) {
        y = minValue * epsilon > 0 ? x + minValue * epsilon : x + minValue
    }
    if (y === +1 / 0) {
        y = +maxValue
    }
    const b = x + (y - x) / 2
    if (x < b && b < y) {
        y = b
    }
    const c = (y + x) / 2
    if (x < c && c < y) {
        y = c
    }
    return y === 0 ? -0 : y
}

export function nextDown(x: number): number {
    return -nextUp(-x)
}
