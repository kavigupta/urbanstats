// letters that NFD doesn't split into a base letter and an accent
const foldedLetters: Record<string, string> = { ß: 'ss', ı: 'i', ł: 'l', đ: 'd', ð: 'd', ø: 'o', æ: 'ae', œ: 'oe', ħ: 'h', ə: 'a' }

/** Folds away the differences search should ignore: case, accents, and punctuation. */
export function normalize(a: string, handlePunctuation = true): string {
    a = a.toLowerCase()
    a = a.normalize('NFD')
    a = a.replace(/[̀-ͯ]/g, '')
    a = a.replace(/[ßıłđðøæœħə]/g, c => foldedLetters[c])
    if (handlePunctuation) {
        a = a.replace(/[,\(\)\[\]]/g, '')
        a = a.replaceAll('-', ' ')
    }
    return a
}
