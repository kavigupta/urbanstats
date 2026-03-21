import { ArticleRow } from './components/load-article'
import { assert } from './utils/defensive'

export function compareArticleRows(a: ArticleRow, b: ArticleRow, direction: 'up' | 'down'): number {
    if (a.kind === 'metadata' || b.kind === 'metadata') {
        assert(a.kind === 'metadata' && b.kind === 'metadata', 'Cannot compare a metadata row with a non-metadata row')
        const comparison = a.statval.localeCompare(b.statval)
        if (comparison !== 0) {
            return direction === 'up' ? comparison : -comparison
        }
    }
    else {
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
    }
    return direction === 'up' ? a.renderedStatname.localeCompare(b.renderedStatname) : b.renderedStatname.localeCompare(a.renderedStatname)
}
