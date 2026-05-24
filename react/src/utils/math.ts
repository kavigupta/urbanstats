export function firstNonNan(numbers: number[]): number {
    for (const num of numbers) {
        if (!isNaN(num)) {
            return num
        }
    }
    return NaN
}
