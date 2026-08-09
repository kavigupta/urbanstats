import { ArticleRow, isNoValue, MetadataStatValue } from './components/load-article'

function sortKey(statval: number | MetadataStatValue): string {
    if (typeof statval === 'object') {
        return statval.representatives.map(representative => representative.districtLongname).join(' ')
    }
    return String(statval)
}

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
    let directComparison
    if (typeof a.statval === 'number' && typeof b.statval === 'number') {
        directComparison = a.statval - b.statval
    }
    else {
        directComparison = sortKey(a.statval).localeCompare(sortKey(b.statval))
    }
    if (directComparison !== 0) {
        return direction === 'up' ? directComparison : -directComparison
    }
    return nameCompared
}
