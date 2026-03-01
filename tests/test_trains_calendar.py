import unittest
import datetime
from typing import Dict, List

from urbanstats.osm.trains import duplicate_and_shift_calendar


def parse_date(date_str: str) -> datetime.date:
    """Convert a YYYY-MM-DD string to a datetime.date object."""
    return datetime.datetime.strptime(date_str, "%Y-%m-%d").date()


def format_date(date: datetime.date) -> str:
    """Convert a datetime.date object to a YYYY-MM-DD string."""
    return date.strftime("%Y-%m-%d")


class DeduplicateAndShiftCalendarTests(unittest.TestCase):
    maxDiff = None

    def assertDSC(self, start, end, start_common, end_common, max_shift_days, expected):
        date_mapping = duplicate_and_shift_calendar(
            parse_date(start),
            parse_date(end),
            parse_date(start_common),
            parse_date(end_common),
        )
        if date_mapping is not None:
            date_mapping = [format_date(d) for d in date_mapping]
        self.assertEqual(date_mapping, expected)

    def test_exact_match(self):
        self.assertDSC(
            start="2024-01-01",
            end="2024-01-07",
            start_common="2024-01-01",
            end_common="2024-01-07",
            max_shift_days=7,
            expected=[
                "2024-01-01",
                "2024-01-02",
                "2024-01-03",
                "2024-01-04",
                "2024-01-05",
                "2024-01-06",
                "2024-01-07",
            ],
        )

    def test_shifted_forward(self):
        self.assertDSC(
            start="2024-01-01",
            end="2024-01-07",
            start_common="2024-01-08",
            end_common="2024-01-14",
            max_shift_days=10,
            expected=[
                "2024-01-01",
                "2024-01-02",
                "2024-01-03",
                "2024-01-04",
                "2024-01-05",
                "2024-01-06",
                "2024-01-07",
            ],
        )

    def test_shifted_backward(self):
        self.assertDSC(
            start="2024-01-05",
            end="2024-01-19",
            start_common="2024-01-01",
            end_common="2024-01-07",
            max_shift_days=10,
            expected=[
                "2024-01-08",
                "2024-01-09",
                "2024-01-10",
                "2024-01-11",
                "2024-01-05",
                "2024-01-06",
                "2024-01-07",
            ],
        )

    def test_multi_week_common_shift(self):
        self.assertDSC(
            start="2024-01-01",
            end="2024-01-14",
            start_common="2024-01-15",
            end_common="2024-01-28",
            max_shift_days=20,
            expected=[
                "2024-01-01",
                "2024-01-02",
                "2024-01-03",
                "2024-01-04",
                "2024-01-05",
                "2024-01-06",
                "2024-01-07",
                "2024-01-08",
                "2024-01-09",
                "2024-01-10",
                "2024-01-11",
                "2024-01-12",
                "2024-01-13",
                "2024-01-14",
            ],
        )

    def test_multi_week_common_shift_wrap(self):
        self.assertDSC(
            start="2024-01-01",
            end="2024-01-14",
            start_common="2024-01-16",
            end_common="2024-01-29",
            max_shift_days=20,
            expected=[
                "2024-01-09",
                "2024-01-10",
                "2024-01-11",
                "2024-01-12",
                "2024-01-13",
                "2024-01-14",
                "2024-01-01",
                "2024-01-02",
                "2024-01-03",
                "2024-01-04",
                "2024-01-05",
                "2024-01-06",
                "2024-01-07",
                "2024-01-08",
                # end is lined up, not the beginning.
            ],
        )

    def test_multi_week_common_shift_wrap_dupe(self):
        self.assertDSC(
            start="2024-01-01",
            end="2024-01-07",
            start_common="2024-01-16",
            end_common="2024-01-29",
            max_shift_days=20,
            expected=[
                "2024-01-02",
                "2024-01-03",
                "2024-01-04",
                "2024-01-05",
                "2024-01-06",
                "2024-01-07",
                "2024-01-01",
                "2024-01-02",
                "2024-01-03",
                "2024-01-04",
                "2024-01-05",
                "2024-01-06",
                "2024-01-07",
                "2024-01-01",
            ],
        )

    def test_three_weeks_but_four_in_common(self):
        self.assertDSC(
            start="2024-01-01",
            end="2024-01-21",
            start_common="2024-01-01",
            end_common="2024-01-28",
            max_shift_days=30,
            expected=[
                "2024-01-15",
                "2024-01-16",
                "2024-01-17",
                "2024-01-18",
                "2024-01-19",
                "2024-01-20",
                "2024-01-21",
                "2024-01-01",
                "2024-01-02",
                "2024-01-03",
                "2024-01-04",
                "2024-01-05",
                "2024-01-06",
                "2024-01-07",
                "2024-01-08",
                "2024-01-09",
                "2024-01-10",
                "2024-01-11",
                "2024-01-12",
                "2024-01-13",
                "2024-01-14",
                "2024-01-15",
                "2024-01-16",
                "2024-01-17",
                "2024-01-18",
                "2024-01-19",
                "2024-01-20",
                "2024-01-21",
            ],
        )
