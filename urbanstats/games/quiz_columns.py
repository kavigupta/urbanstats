from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.output_statistics_metadata import (
    get_statistic_categories,
    internal_statistic_names,
)

types = [
    "City",
    "County",
    "MSA",
    "State",
    "Urban Area",
    "Congressional District",
    "Media Market",
    "Judicial Circuit",
    "Country",
    "Subnational Region",
    "Urban Center",
]
stats_to_display = {}

for collection in statistic_collections:
    stats_to_display.update(collection.quiz_question_names())

not_included = set()

for collection in statistic_collections:
    not_included.update(collection.quiz_question_unused())

stats = sorted(stats_to_display, key=str)
categories = sorted({get_statistic_categories()[x] for x in stats})

unrecognized = (set(stats) | set(not_included)) - set(internal_statistic_names())
assert not unrecognized, unrecognized

extras = set(internal_statistic_names()) - (set(stats) | set(not_included))
assert not extras, extras
