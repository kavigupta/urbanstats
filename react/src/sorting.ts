import { ArticleRow, isNoValue } from './components/load-article'

export function compareArticleRows(a: ArticleRow, b: ArticleRow, direction: 'up' | 'down'): number {
    const nameCompared = direction === 'up' ? a.renderedStatname.localeCompare(b.renderedStatname) : b.renderedStatname.localeCompare(a.renderedStatname)
    if (isNoValue(a.statval) && isNoValue(b.statval)) {
        return nameCompared
    }
    if (isNoValue(a.statval)) {
        return 1
    }
    if (isNoValue(b.statval)) {
        return -1
    }
    const directComparison = a.statval - b.statval
    if (directComparison !== 0) {
        return direction === 'up' ? directComparison : -directComparison
    }
    return nameCompared
}
