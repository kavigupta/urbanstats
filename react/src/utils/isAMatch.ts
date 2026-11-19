/*
    Check whether a is a substring of b (does not have to be contiguous)
*/
export function isAMatch(a: string, b: string): number {
    let i = 0
    let matchCount = 0
    let prevMatch = true
    // eslint-disable-next-line @typescript-eslint/prefer-for-of -- b is a string
    for (let j = 0; j < b.length; j++) {
        if (a[i] === b[j]) {
            i++
            if (prevMatch) {
                matchCount++
            }
            prevMatch = true
        }
        else {
            prevMatch = false
        }
        if (i === a.length) {
            return matchCount + 1
        }
    }
    return 0
}
