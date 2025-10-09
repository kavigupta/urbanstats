import { ArticleRow } from './components/load-article'

export function compareArticleRows(a: ArticleRow, b: ArticleRow, direction: 'up' | 'down'): number {
    if (!isNaN(a.statval) && !isNaN(b.statval)) {
        return direction === 'up' ? a.statval - b.statval : b.statval - a.statval
    }
    // always put NaN values at the end
    if (isNaN(a.statval)) {
        return 1
    }
    if (isNaN(b.statval)) {
        return -1
    }
    return direction === 'up' ? a.renderedStatname.localeCompare(b.renderedStatname) : b.renderedStatname.localeCompare(a.renderedStatname)
}
