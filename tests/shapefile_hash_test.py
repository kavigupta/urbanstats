import unittest

import attr
from permacache import stable_hash

from urbanstats.geometry.shapefiles.row_functions import column
from urbanstats.geometry.shapefiles.shapefiles.cities import CITIES
from urbanstats.geometry.shapefiles.shapefiles.counties import COUNTIES
from urbanstats.geometry.shapefiles.shapefiles.county_cross_cd import COUNTY_CROSS_CD
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles


class TestShapefileHash(unittest.TestCase):
    def test_every_shapefile_can_be_stable_hashed(self):
        for name, shapefile in shapefiles.items():
            with self.subTest(name):
                stable_hash(shapefile)

    def test_naming_change_changes_only_names(self):
        renamed = attr.evolve(
            COUNTIES,
            naming=attr.evolve(COUNTIES.naming, shortname_extractor=column("NAME")),
        )
        self.assertNotEqual(stable_hash(renamed.names), stable_hash(COUNTIES.names))
        self.assertEqual(stable_hash(renamed.geometry), stable_hash(COUNTIES.geometry))
        self.assertEqual(stable_hash(renamed.dates), stable_hash(COUNTIES.dates))
        self.assertEqual(
            stable_hash(renamed.identified), stable_hash(COUNTIES.identified)
        )

    def test_temporal_change_changes_only_dates(self):
        redated = attr.evolve(
            COUNTIES, temporal=attr.evolve(COUNTIES.temporal, start_date_overall=2020)
        )
        self.assertNotEqual(stable_hash(redated.dates), stable_hash(COUNTIES.dates))
        self.assertEqual(stable_hash(redated.names), stable_hash(COUNTIES.names))

    def test_disambiguating_names_change_changes_names(self):
        renamed_counties = attr.evolve(
            COUNTIES.naming, shortname_extractor=column("NAME")
        )
        cities = attr.evolve(
            CITIES,
            naming=attr.evolve(
                CITIES.naming,
                disambiguate_with=attr.evolve(COUNTIES.names, naming=renamed_counties),
            ),
        )
        self.assertNotEqual(stable_hash(cities.names), stable_hash(CITIES.names))

    def test_input_naming_change_changes_derived_geometry(self):
        renamed_counties = attr.evolve(
            COUNTIES.names,
            naming=attr.evolve(COUNTIES.naming, shortname_extractor=column("NAME")),
        )
        cds_names, cds_dates, _ = COUNTY_CROSS_CD.geometry.inputs
        derived = attr.evolve(
            COUNTY_CROSS_CD.geometry, inputs=(cds_names, cds_dates, renamed_counties)
        )
        self.assertNotEqual(stable_hash(derived), stable_hash(COUNTY_CROSS_CD.geometry))
