import { ClientFunction } from 'testcafe'

import { loadSitemap } from './sitemap_test_template'
import { target, urbanstatsFixture } from './test_utils'

urbanstatsFixture('home page', target)

test('sitemap contains all links in sidebar', async (t) => {
    const sidebarLinksWithoutTarget = await ClientFunction(() => Array.from(document.querySelectorAll('.left_panel a[href]')).map(link => link.getAttribute('href')!))()
    const remap = (link: string): string => link === '/' ? target : target + link
    const sidebarLinks = sidebarLinksWithoutTarget.map(remap)
    const sitemap = await loadSitemap(t)
    const missingFromSitemap = sidebarLinks.filter(link => !sitemap.includes(link))
    await t.expect(missingFromSitemap).eql([])
})
