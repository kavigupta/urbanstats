import { assert } from '../utils/defensive'
import { loadArticleFromPossibleSymlink } from '../utils/symlinks'

export async function fetchUrbanAreaZips(urbanAreaLongname: string): Promise<string[]> {
    const article = await loadArticleFromPossibleSymlink(urbanAreaLongname)
    // Find contained ZIP codes
    const containedButtons = article.related.find(r => r.relationshipType === 'contains')?.buttons ?? undefined
    assert(containedButtons !== undefined, `Expected 'contains' relationship with buttons for urban area ${urbanAreaLongname}`)
    return containedButtons.filter(b => b.rowType === 'ZIP').map((b) => {
        assert(b.longname !== undefined && b.longname !== null, 'expected a longname for ZIP button')
        return b.longname
    })
}
