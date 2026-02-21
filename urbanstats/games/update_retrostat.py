import argparse
import itertools
import os

from urbanstats.games.fixed import retrostat as fixed_up_to
from urbanstats.games.quiz import compute_fractional_days
from urbanstats.games.retrostat import (
    day_for_week,
    generate_retrostat,
    output_retrostat,
    questions_week_for_retrostat,
)
from urbanstats.games.update_fixed import copy_up_to


def compute_last_retrostat_week_generable():
    days_finished = int(compute_fractional_days("US/Samoa"))
    for retro_week in itertools.count(1):
        questions = day_for_week(questions_week_for_retrostat(retro_week))
        if max(questions) >= days_finished:
            return retro_week - 1, questions[-1] - 7
    raise RuntimeError("Unreachable")


def create_retrostats(folder, retrostat_up_to):
    for retrostat_week in range(fixed_up_to + 1, retrostat_up_to + 1):
        print(retrostat_week)
        out = generate_retrostat(retrostat_week)
        output_retrostat(folder, retrostat_week, out)


def main(path):
    week, day = compute_last_retrostat_week_generable()
    copy_up_to("juxtastat", day)
    create_retrostats(os.path.join(path, "retrostat"), week)
    copy_up_to("retrostat", week, folder=path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update retrostat data.")
    parser.add_argument(
        "path", help="Site folder path (e.g. site or react/test/density-db)"
    )
    args = parser.parse_args()
    main(args.path)
