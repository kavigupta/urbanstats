import { loadArticleFromPossibleSymlink } from '../utils/symlinks'

export async function fetchUrbanAreaZips(urbanAreaLongname: string): Promise<string[]> {
    const article = await loadArticleFromPossibleSymlink(urbanAreaLongname)
    // Find contained ZIP codes
    const contained = article.related.find(r => r.relationshipType === 'contains')
    return contained?.buttons ? contained.buttons.filter(b => b.rowType === 'ZIP').map(b => b.longname ?? '') : []
}
