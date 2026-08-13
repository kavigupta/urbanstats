import { assert } from '../utils/defensive'
import { loadArticleFromPossibleSymlink } from '../utils/symlinks'

export async function fetchRelatedZips(urbanAreaLongname: string, relationshipType: 'contains' | 'borders'): Promise<string[]> {
    const article = await loadArticleFromPossibleSymlink(urbanAreaLongname)
    // Find contained ZIP codes
    const containedButtons = article.related.find(r => r.relationshipType === relationshipType)?.buttons ?? undefined
    assert(containedButtons !== undefined, `Expected '${relationshipType}' relationship with buttons for urban area ${urbanAreaLongname}`)
    return containedButtons.filter(b => b.rowType === 'ZIP').map((b) => {
        assert(b.longname !== undefined && b.longname !== null, 'expected a longname for ZIP button')
        return b.longname
    })
}
