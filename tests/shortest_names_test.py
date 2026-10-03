import unittest

from urbanstats.website_data.shortest_names import shortest_name


class ShortestNameTest(unittest.TestCase):
    def test_removes_the_kind(self):
        self.assertEqual(shortest_name("Los Angeles County", "County"), "Los Angeles")
        self.assertEqual(shortest_name("Cook CCD", "CCD"), "Cook")
        self.assertEqual(shortest_name("Tokyo 100MPC", "100M Person Circle"), "Tokyo")
        self.assertEqual(
            shortest_name("CA-12 (2023)", "Congressional District"), "CA-12"
        )

    def test_only_the_lower_case_kind_of_a_place(self):
        self.assertEqual(shortest_name("Salt Lake City city", "City"), "Salt Lake City")
        self.assertEqual(shortest_name("Princeton", "City"), "Princeton")

    def test_longest_kind_is_removed(self):
        self.assertEqual(
            shortest_name("Austin Independent School District", "School District"),
            "Austin",
        )
        self.assertEqual(
            shortest_name(
                "Navajo Nation Reservation and Off-Reservation Trust Land",
                "Native Area",
            ),
            "Navajo Nation",
        )

    def test_kind_is_specific_to_the_type(self):
        self.assertEqual(shortest_name("Chicago Urban Area", "Urban Area"), "Chicago")
        self.assertEqual(
            shortest_name("Cheyenne and Arapaho District 2", "Native Subdivision"),
            "Cheyenne and Arapaho District 2",
        )

    def test_part_of_a_longer_kind_is_kept(self):
        self.assertEqual(
            shortest_name(
                "Lowville Academy and Central School District", "School District"
            ),
            "Lowville Academy and Central School District",
        )

    def test_nothing_but_the_kind_is_kept(self):
        self.assertEqual(shortest_name("County", "County"), "County")
