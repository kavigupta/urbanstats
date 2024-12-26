import urllib.parse


def output_sitemap(full, site_folder):
    article_urls = [
        f"https://urbanstats.org/article.html?longname={urllib.parse.quote_plus(longname)}"
        for longname in list(full.longname)
    ]

    # 50k is max number of entries in a sitemap
    max_entries = 50000
    q, r = divmod(len(article_urls), max_entries)
    num_sitemap_fragments = q + bool(r)
    for i in range(0, num_sitemap_fragments):
        with open(f"{site_folder}/sitemaps/articles{i}.txt", "w") as f:
            f.write("\n".join(article_urls[i * max_entries : (i + 1) * max_entries]))

    with open(f"{site_folder}/robots.txt", "w") as f:
        f.write(
            "\n".join(
                [
                    f"Sitemap: https://urbanstats.org/sitemaps/articles{i}.txt"
                    for i in range(0, num_sitemap_fragments)
                ]
            )
        )
