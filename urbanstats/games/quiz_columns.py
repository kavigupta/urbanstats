from urbanstats.games.quiz_question_metadata import QuizQuestionSkip
from urbanstats.games.quiz_regions import get_quiz_stats
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.output_statistics_metadata import (
    get_statistic_categories,
    internal_statistic_names,
)

all_descriptors = {}
stats_to_types = {}
not_included = set()

for collection in statistic_collections:
    for name, desc in collection.quiz_question_descriptors().items():
        all_descriptors[name] = desc
        if isinstance(desc, QuizQuestionSkip):
            not_included.add(name)
        stats_to_types[name] = collection.quiz_question_types()

stats_to_display = {k: d.name for k, d, _ in get_quiz_stats()}
stats = sorted(stats_to_display, key=str)
categories = sorted({get_statistic_categories()[x] for x in stats})
