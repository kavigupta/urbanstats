/** Folds away the differences search should ignore: case, accents, and punctuation. */
export function normalize(a: string, handlePunctuation = true): string {
    a = a.toLowerCase()
    a = a.normalize('NFD')
    a = a.replace(/[̀-ͯ]/g, '')
    if (handlePunctuation) {
        a = a.replace(/[,\(\)\[\]]/g, '')
        a = a.replaceAll('-', ' ')
    }
    return a
}
