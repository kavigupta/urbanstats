import unittest

from urbanstats.geometry.districts import consistent_district_padding


class TestDistricts(unittest.TestCase):
    def test_noop(self):
        self.assertEqual(
            consistent_district_padding(["CA", "CA"], ["1", "2"]), ["1", "2"]
        )

    def test_more_padding(self):
        self.assertEqual(
            consistent_district_padding(["CA", "CA"], ["1", "2"], minimum_length=2),
            ["01", "02"],
        )

    def test_noop_lstrip(self):
        self.assertEqual(
            consistent_district_padding(["CA", "CA"], ["01", "02"]), ["1", "2"]
        )
        self.assertEqual(
            consistent_district_padding(["CA", "CA"], ["1", "02"]), ["1", "2"]
        )

    def test_noop_two_digits(self):
        self.assertEqual(
            consistent_district_padding(["CA", "CA"], ["10", "20"]), ["10", "20"]
        )

    def test_noop_two_digits_lstrip(self):
        self.assertEqual(
            consistent_district_padding(["CA", "CA"], ["010", "20"]), ["10", "20"]
        )

    def test_actual_padding(self):
        self.assertEqual(
            consistent_district_padding(["CA", "CA"], ["1", "20"]), ["01", "20"]
        )

    def test_padding_only_numeric(self):
        self.assertEqual(
            consistent_district_padding(["CA", "CA"], ["1", "20a"]), ["01", "20a"]
        )

    def test_no_numerical(self):
        self.assertEqual(
            consistent_district_padding(["CA", "CA"], ["a", "b"]), ["a", "b"]
        )

    def test_different_by_state(self):
        self.assertEqual(
            consistent_district_padding(
                ["CA", "CA", "CA", "TX"], ["1", "2", "30", "1"]
            ),
            ["01", "02", "30", "1"],
        )
