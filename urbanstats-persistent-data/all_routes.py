# This file only exists to ensure vulture does not think route function are unused

from urbanstats_persistent_data.db.friends import InfiniteResult
from urbanstats_persistent_data.db.stats import PerQuestionStats
from urbanstats_persistent_data.routes.email import get_email_route
from urbanstats_persistent_data.routes.friends import (
    juxtastat_friend_request,
    juxtastat_infinite_results,
    juxtastat_todays_score_for,
    juxtastat_unfriend,
)
from urbanstats_persistent_data.routes.shorten import (
    lengthen_request,
    route_s,
    shorten_request,
)
from urbanstats_persistent_data.routes.stats import (
    HasInfiniteStatsResponse,
    juxtastat_get_per_question_stats_request,
    juxtastat_infinite_has_infinite_stats_request,
    juxtastat_infinite_store_user_stats_request,
    juxtastat_latest_day_request,
    juxtastat_register_user_request,
    juxtastat_store_user_stats_request,
    retrostat_get_per_question_stats_request,
    retrostat_latest_week_request,
    retrostat_store_user_stats_request,
)
from urbanstats_persistent_data.utils import HTTPExceptionModel

from tests.conftest import setup_app

get_email_route

juxtastat_friend_request
juxtastat_todays_score_for
juxtastat_infinite_results
juxtastat_unfriend

lengthen_request
shorten_request
route_s

retrostat_latest_week_request
retrostat_get_per_question_stats_request
juxtastat_infinite_has_infinite_stats_request
juxtastat_get_per_question_stats_request
juxtastat_register_user_request
juxtastat_latest_day_request
juxtastat_store_user_stats_request
retrostat_store_user_stats_request
juxtastat_infinite_store_user_stats_request

# not routes but same category
setup_app
inf_result = InfiniteResult(
    friends=True, forThisSeed=9, maxScore=456, maxScoreSeed="789", maxScoreVersion=1
)
inf_result.forThisSeed
inf_result.maxScore
inf_result.maxScoreSeed
inf_result.maxScoreVersion

per_q = PerQuestionStats(total=1, per_question=[0, 0, 0, 0, 1])
per_q.per_question

has_inf = HasInfiniteStatsResponse(has=[True])
has_inf.has

http_exc = HTTPExceptionModel()
http_exc.detail
