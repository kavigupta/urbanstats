# This file only exists to ensure vulture does not think route function are unused

from urbanstats_persistent_data.routes.stats import (
    retrostat_latest_week_request,
    retrostat_get_per_question_stats_request,
    juxtastat_infinite_has_infinite_stats_request,
    juxtastat_get_per_question_stats_request,
    juxtastat_register_user_request,
    juxtastat_latest_day_request,
    juxtastat_store_user_stats_request,
    retrostat_store_user_stats_request,
)
from urbanstats_persistent_data.routes.friends import juxtastat_friend_request, juxtastat_todays_score_for, juxtastat_infinite_results
from urbanstats_persistent_data.routes.shorten import (
    lengthen_request,
    shorten_request,
    route_s,
)

retrostat_latest_week_request
retrostat_get_per_question_stats_request
juxtastat_infinite_has_infinite_stats_request
juxtastat_get_per_question_stats_request
juxtastat_register_user_request
juxtastat_latest_day_request
juxtastat_store_user_stats_request
retrostat_store_user_stats_request

juxtastat_friend_request
juxtastat_todays_score_for
juxtastat_infinite_results

lengthen_request
shorten_request
route_s
