from permacache import stable_hash

from urbanstats.games.quiz_question_metadata import QuizQuestionSkip
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.output_statistics_metadata import (
    get_statistic_categories,
    internal_statistic_names,
)

stats_to_display = {}
stats_to_types = {}
not_included = set()

for collection in statistic_collections:
    for name, desc in collection.quiz_question_descriptors().items():
        if isinstance(desc, QuizQuestionSkip):
            not_included.add(name)
        else:
            stats_to_display[name] = desc.name
        stats_to_types[name] = collection.quiz_question_types()

stats = sorted(stats_to_display, key=str)
categories = sorted({get_statistic_categories()[x] for x in stats})

unrecognized = (set(stats) | set(not_included)) - set(internal_statistic_names())
assert not unrecognized, unrecognized

extras = set(internal_statistic_names()) - (set(stats) | set(not_included))
assert not extras, extras
