from urllib.parse import quote_plus
from urbanstats.statistics.output_statistics_metadata import (
    statistic_internal_to_display_name,
)
from urbanstats.ordinals.ordering_info_outputter import reorganize_counts
from urbanstats.statistics.output_statistics_metadata import internal_statistic_names


def output_sitemap(site_folder, articles, ordinal_info):
    top_level_pages = [
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

    article_urls = [
        f"https://urbanstats.org/article.html?longname={quote_plus(longname)}"
        for longname in list(articles.longname)
    ]

    statistic_urls = []
    # We want the same counts that are output to the site
    counts = reorganize_counts(ordinal_info, ordinal_info.counts_by_type_universe_col())
    stat_names = list(statistic_internal_to_display_name.values())
    for universe, article_types in counts.items():
        for article_type, stat_counts in article_types.items():
            for stat_index, stat_count in enumerate(stat_counts):
                if stat_count > 0:
                    statistic_urls.append(
                        f"https://urbanstats.org/statistic.html?statname={quote_plus(stat_names[stat_index])}&article_type={quote_plus(article_type)}&universe={universe}"
                    )

    all_sitemap_urls = top_level_pages + article_urls + statistic_urls

    # 50k is max number of entries in a sitemap
    max_entries = 50000
    q, r = divmod(len(all_sitemap_urls), max_entries)
    num_sitemap_fragments = q + bool(r)
    for i in range(0, num_sitemap_fragments):
        with open(f"{site_folder}/sitemaps/sitemap{i}.txt", "w") as f:
            f.write(
                "\n".join(all_sitemap_urls[i * max_entries : (i + 1) * max_entries])
            )

    with open(f"{site_folder}/robots.txt", "w") as f:
        f.write(
            "\n".join(
                [
                    f"Sitemap: https://urbanstats.org/sitemaps/sitemap{i}.txt"
                    for i in range(0, num_sitemap_fragments)
                ]
            )
        )
