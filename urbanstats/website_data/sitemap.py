from urllib.parse import urlencode

from urbanstats.ordinals.ordering_info_outputter import reorganize_counts


def output_sitemap(site_folder, articles, ordinal_info):
    all_sitemap_urls = (
        top_level_pages() + article_urls(articles) + statistic_urls(ordinal_info)
    )

    # 50k is max number of entries in a sitemap
    max_entries = 50000
    paths = []
    for i, start in enumerate(range(0, len(all_sitemap_urls), max_entries)):
        path = f"{site_folder}/sitemaps/sitemap{i}.txt"
        paths.append(path)
        with open(path, "w") as f:
            f.write("\n".join(all_sitemap_urls[start : start + max_entries]))

    with open(f"{site_folder}/robots.txt", "w") as f:
        f.write("\n".join(paths))


def top_level_pages():
    return [
        "https://urbanstats.org",
        "https://urbanstats.org/about.html",
        "https://urbanstats.org/data-credit.html",
        "https://urbanstats.org/mapper.html",
        "https://urbanstats.org/random.html?sampleby=uniform",
        "https://urbanstats.org/random.html?sampleby=population",
        "https://urbanstats.org/random.html?sampleby=population&us_only=true",
        "https://urbanstats.org/quiz.html",
        "https://urbanstats.org/quiz.html#mode=retro",
    ]


def article_urls(articles):
    result = []
    for longname in list(articles.longname):
        params = {"longname": longname}
        result.append(f"https://urbanstats.org/article.html?{urlencode(params)}")
    return result


def statistic_urls(ordinal_info):
    result = []
    # We want the same counts that are output to the site
    counts = reorganize_counts(ordinal_info, ordinal_info.counts_by_type_universe_col())
    for universe, article_types in counts.items():
        for (stat_name, article_type), stat_count in article_types:
            if stat_count > 0:
                params = {
                    "statname": stat_name,
                    "article_type": article_type,
                    "universe": universe,
                }
                result.append(
                    f"https://urbanstats.org/statistic.html?{urlencode(params)}"
                )
    return result
