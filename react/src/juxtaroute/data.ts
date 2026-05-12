import { loadArticleFromPossibleSymlink } from '../utils/symlinks'
import { Article } from '../utils/protos'
import { loadArticles, ArticleStatisticRow } from '../components/load-article'
import { getCountsByArticleType } from '../components/countsByArticleType'

export async function fetchZipStats(zipLongname: string): Promise<ArticleStatisticRow[]> {
    const article = await loadArticleFromPossibleSymlink(zipLongname)
    const counts = await getCountsByArticleType()
    
    // Default universe is usually 'USA' or 'world', 
    // we need a universe that makes sense for the article.
    const universe = article.universes[0] 
    
    const { rows } = await loadArticles([article], counts, universe)
    // Return statistics for the article (assuming it's a single article)
    return rows({} as any).flat() as ArticleStatisticRow[]
}

export async function fetchZipNeighbors(zipLongname: string): Promise<string[]> {
    const article = await loadArticleFromPossibleSymlink(zipLongname)
    // Find borders relationship
    const borders = article.related.find(r => r.relationshipType === 'borders')
    return borders?.buttons ? borders.buttons.filter(b => b.rowType === 'ZIP').map(b => b.longname ?? '') : []
}
