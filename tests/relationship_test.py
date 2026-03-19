import unittest

from urbanstats.geometry.relationship_equirectangular import compute_relationships
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles


@unittest.skip(
    "These tests require shapefiles. can't run on the CI."
    " see `relationships.test.ts` for dupes of these that run on the CI"
)
class RelationshipTest(unittest.TestCase):
    def relationshipsFlat(self, k1, k2, filter_geos=lambda _: True):
        relationships = compute_relationships(shapefiles[k1], shapefiles[k2])
        relationships_flat = {
            (a, b, rel)
            for rel, a_b_s in relationships.items()
            for a, b in a_b_s
            if filter_geos(a) or filter_geos(b)
        }
        print(relationships_flat)
        return relationships_flat

    def test_neighbors_california(self):
        self.assertEqual(
            self.relationshipsFlat(
                "subnational_regions",
                "subnational_regions",
                lambda g: g.startswith("California"),
            ),
            {
                ("California, USA", "California, USA", "same_geography"),
                ("Arizona, USA", "California, USA", "borders"),
                ("Baja California, Mexico", "California, USA", "borders"),
                ("California, USA", "Arizona, USA", "borders"),
                ("California, USA", "Baja California, Mexico", "borders"),
                ("California, USA", "Nevada, USA", "borders"),
                ("California, USA", "Oregon, USA", "borders"),
                ("Nevada, USA", "California, USA", "borders"),
                ("Oregon, USA", "California, USA", "borders"),
            },
        )

    def test_neighbors_michigan(self):
        self.assertEqual(
            self.relationshipsFlat(
                "subnational_regions",
                "subnational_regions",
                lambda g: g.startswith("Michigan"),
            ),
            {
                ("Michigan, USA", "Michigan, USA", "same_geography"),
                ("Indiana, USA", "Michigan, USA", "borders"),
                ("Michigan, USA", "Indiana, USA", "borders"),
                ("Michigan, USA", "Wisconsin, USA", "borders"),
                ("Wisconsin, USA", "Michigan, USA", "borders"),
                ("Michigan, USA", "Ohio, USA", "borders"),
                ("Ohio, USA", "Michigan, USA", "borders"),
                ("Michigan, USA", "Ontario, Canada", "borders"),
                ("Ontario, Canada", "Michigan, USA", "borders"),
            },
        )

    def test_contents_borders_delaware(self):
        self.assertEqual(
            self.relationshipsFlat(
                "subnational_regions",
                "counties",
                lambda g: g.startswith("Delaware, USA"),
            ),
            {
                ("Delaware, USA", "Sussex County, Delaware, USA", "a_contains_b"),
                ("Delaware, USA", "New Castle County, Delaware, USA", "a_contains_b"),
                ("Delaware, USA", "Kent County, Delaware, USA", "a_contains_b"),
                ("Delaware, USA", "Worcester County, Maryland, USA", "borders"),
                ("Delaware, USA", "Wicomico County, Maryland, USA", "borders"),
                ("Delaware, USA", "Dorchester County, Maryland, USA", "borders"),
                ("Delaware, USA", "Caroline County, Maryland, USA", "borders"),
                ("Delaware, USA", "Queen Anne's County, Maryland, USA", "borders"),
                ("Delaware, USA", "Cecil County, Maryland, USA", "borders"),
                ("Delaware, USA", "Kent County, Maryland, USA", "borders"),
                ("Delaware, USA", "Chester County, Pennsylvania, USA", "borders"),
                ("Delaware, USA", "Delaware County, Pennsylvania, USA", "borders"),
                ("Delaware, USA", "Gloucester County, New Jersey, USA", "borders"),
                ("Delaware, USA", "Salem County, New Jersey, USA", "borders"),
            },
        )

    def test_continents_for_turkey(self):
        self.assertEqual(
            self.relationshipsFlat(
                "countries",
                "continents",
                lambda g: g.startswith("Turkey"),
            ),
            {("Turkey", "Asia", "intersects"), ("Turkey", "Europe", "intersects")},
        )

    def test_continents_for_guatemala(self):
        self.assertEqual(
            self.relationshipsFlat(
                "countries",
                "continents",
                lambda g: g.startswith("Guatemala"),
            ),
            {("Guatemala", "North America", "a_contained_by_b")},
        )

    def test_counties_for_la_urban_area(self):
        self.assertEqual(
            self.relationshipsFlat(
                "urban_areas",
                "counties",
                lambda g: g.startswith("Los Angeles-"),
            ),
            {
                (
                    "Los Angeles-Long Beach-Anaheim [Urban Area], CA, USA",
                    "Orange County, California, USA",
                    "intersects",
                ),
                (
                    "Los Angeles-Long Beach-Anaheim [Urban Area], CA, USA",
                    "San Bernardino County, California, USA",
                    "intersects",
                ),
                (
                    "Los Angeles-Long Beach-Anaheim [Urban Area], CA, USA",
                    "Los Angeles County, California, USA",
                    "intersects",
                ),
                (
                    "Los Angeles-Long Beach-Anaheim [Urban Area], CA, USA",
                    "Ventura County, California, USA",
                    "borders",
                ),
                (
                    "Los Angeles-Long Beach-Anaheim [Urban Area], CA, USA",
                    "Riverside County, California, USA",
                    "borders",
                ),
            },
        )

    def test_san_marino_city_relationships(self):
        self.assertEqual(
            self.relationshipsFlat(
                "cities",
                "cities",
                lambda g: g.startswith("San Marino"),
            ),
            {
                (
                    "San Marino city, California, USA",
                    "San Marino city, California, USA",
                    "same_geography",
                ),
                # Pasadena
                (
                    "San Marino city, California, USA",
                    "Pasadena city, California, USA",
                    "borders",
                ),
                (
                    "Pasadena city, California, USA",
                    "San Marino city, California, USA",
                    "borders",
                ),
                # San Pasqual
                (
                    "San Marino city, California, USA",
                    "San Pasqual CDP, California, USA",
                    "borders",
                ),
                (
                    "San Pasqual CDP, California, USA",
                    "San Marino city, California, USA",
                    "borders",
                ),
                # East Pasadena
                (
                    "East Pasadena CDP, California, USA",
                    "San Marino city, California, USA",
                    "borders",
                ),
                (
                    "San Marino city, California, USA",
                    "East Pasadena CDP, California, USA",
                    "borders",
                ),
                # East San Gabriel
                (
                    "East San Gabriel CDP, California, USA",
                    "San Marino city, California, USA",
                    "borders",
                ),
                (
                    "San Marino city, California, USA",
                    "East San Gabriel CDP, California, USA",
                    "borders",
                ),
                # San Gabriel
                (
                    "San Marino city, California, USA",
                    "San Gabriel city, California, USA",
                    "borders",
                ),
                (
                    "San Gabriel city, California, USA",
                    "San Marino city, California, USA",
                    "borders",
                ),
                # Alhambra
                (
                    "San Marino city, California, USA",
                    "Alhambra city, California, USA",
                    "borders",
                ),
                (
                    "Alhambra city, California, USA",
                    "San Marino city, California, USA",
                    "borders",
                ),
                # South Pasadena
                (
                    "San Marino city, California, USA",
                    "South Pasadena city, California, USA",
                    "borders",
                ),
                (
                    "South Pasadena city, California, USA",
                    "San Marino city, California, USA",
                    "borders",
                ),
            },
        )

    def test_same_geography_msa(self):
        self.assertEqual(
            self.relationshipsFlat(
                "msas",
                "counties",
                lambda g: g.startswith("Los Alamos MSA, NM, USA"),
            ),
            {
                (
                    "Los Alamos MSA, NM, USA",
                    "Los Alamos County, New Mexico, USA",
                    "same_geography",
                ),
                (
                    "Los Alamos MSA, NM, USA",
                    "Santa Fe County, New Mexico, USA",
                    "borders",
                ),
                (
                    "Los Alamos MSA, NM, USA",
                    "Rio Arriba County, New Mexico, USA",
                    "borders",
                ),
                (
                    "Los Alamos MSA, NM, USA",
                    "Sandoval County, New Mexico, USA",
                    "borders",
                ),
            },
        )

    def test_issue_1000_boothbay(self):
        self.assertEqual(
            self.relationshipsFlat(
                "urban_areas",
                "counties",
                lambda g: g.startswith("Boothbay Harbor"),
            ),
            {
                (
                    "Boothbay Harbor [Urban Area], ME, USA",
                    "Lincoln County, Maine, USA",
                    "a_contained_by_b",
                )
            },
        )

    def test_issue_1289_stbernard(self):
        """
        Subregion is >95% of the area but only a small % of the population
        """
        self.assertEqual(
            self.relationshipsFlat(
                "cousub",
                "counties",
                lambda g: g.startswith(
                    "District E [CCD], St. Bernard Parish, Louisiana, USA"
                ),
            ),
            {
                (
                    "District E [CCD], St. Bernard Parish, Louisiana, USA",
                    "St. Bernard Parish, Louisiana, USA",
                    "a_contained_by_b",
                ),
                (
                    "District E [CCD], St. Bernard Parish, Louisiana, USA",
                    "Orleans Parish, Louisiana, USA",
                    "borders",
                ),
                (
                    "District E [CCD], St. Bernard Parish, Louisiana, USA",
                    "Plaquemines Parish, Louisiana, USA",
                    "borders",
                ),
            },
        )

    def test_issue_247_acapulco_5mpc_vs_tokyo_1bpc(self):
        """
        Handle regions that include the poles.
        """
        self.assertEqual(
            self.relationshipsFlat(
                "population_circle_5M",
                "population_circle_1B",
                lambda g: g.startswith("Acapulco"),
            ),
            {
                (
                    "Acapulco 5MPC, Mexico",
                    "São Paulo 1BPC, USA-Brazil-Mexico",
                    "a_contained_by_b",
                )
            },
        )

    def test_issue_78_circuits_6th(self):
        self.assertEqual(
            self.relationshipsFlat(
                "judicial_circuits",
                "subnational_regions",
                lambda g: g.startswith("6th Circuit"),
            ),
            {
                # contains
                ("6th Circuit, USA", "Michigan, USA", "a_contains_b"),
                ("6th Circuit, USA", "Ohio, USA", "a_contains_b"),
                ("6th Circuit, USA", "Kentucky, USA", "a_contains_b"),
                ("6th Circuit, USA", "Tennessee, USA", "a_contains_b"),
                # borders
                ("6th Circuit, USA", "Ontario, Canada", "borders"),
                ("6th Circuit, USA", "Pennsylvania, USA", "borders"),
                ("6th Circuit, USA", "West Virginia, USA", "borders"),
                ("6th Circuit, USA", "Virginia, USA", "borders"),
                ("6th Circuit, USA", "North Carolina, USA", "borders"),
                ("6th Circuit, USA", "Georgia, USA", "borders"),
                ("6th Circuit, USA", "Alabama, USA", "borders"),
                ("6th Circuit, USA", "Mississippi, USA", "borders"),
                ("6th Circuit, USA", "Arkansas, USA", "borders"),
                ("6th Circuit, USA", "Missouri, USA", "borders"),
                ("6th Circuit, USA", "Illinois, USA", "borders"),
                ("6th Circuit, USA", "Indiana, USA", "borders"),
                ("6th Circuit, USA", "Wisconsin, USA", "borders"),
                # not amazing but whatever. it's because of the 1% radius rule and ryan island in lake superior
                ("6th Circuit, USA", "Minnesota, USA", "borders"),
            },
        )

    def test_issue_78_circuits_9th(self):
        self.assertEqual(
            self.relationshipsFlat(
                "judicial_circuits",
                "subnational_regions",
                lambda g: g.startswith("9th Circuit"),
            ),
            {
                # contains
                ("9th Circuit, USA", "Alaska, USA", "a_contains_b"),
                ("9th Circuit, USA", "Washington, USA", "a_contains_b"),
                ("9th Circuit, USA", "Oregon, USA", "a_contains_b"),
                ("9th Circuit, USA", "Idaho, USA", "a_contains_b"),
                ("9th Circuit, USA", "Montana, USA", "a_contains_b"),
                ("9th Circuit, USA", "California, USA", "a_contains_b"),
                ("9th Circuit, USA", "Nevada, USA", "a_contains_b"),
                ("9th Circuit, USA", "Arizona, USA", "a_contains_b"),
                ("9th Circuit, USA", "Hawaii, USA", "a_contains_b"),
                ("9th Circuit, USA", "Guam, USA", "a_contains_b"),
                # borders
                ("9th Circuit, USA", "Yukon, Canada", "borders"),
                ("9th Circuit, USA", "British Columbia, Canada", "borders"),
                ("9th Circuit, USA", "Alberta, Canada", "borders"),
                ("9th Circuit, USA", "Saskatchewan, Canada", "borders"),
                ("9th Circuit, USA", "North Dakota, USA", "borders"),
                ("9th Circuit, USA", "South Dakota, USA", "borders"),
                ("9th Circuit, USA", "Wyoming, USA", "borders"),
                ("9th Circuit, USA", "Utah, USA", "borders"),
                ("9th Circuit, USA", "New Mexico, USA", "borders"),
                ("9th Circuit, USA", "Sonora, Mexico", "borders"),
                ("9th Circuit, USA", "Baja California, Mexico", "borders"),
                # corner
                ("9th Circuit, USA", "Colorado, USA", "borders"),
                # not quite corner, but just because of the padding
                ("9th Circuit, USA", "Chihuahua, Mexico", "borders"),
                ("9th Circuit, USA", "Chukotskiy avtonomnyy okrug, Russia", "borders"),
                # highly non-ideal but whatever. the shapefile just doesn't include it
                ("9th Circuit, USA", "Northern Mariana Islands, USA", "borders"),
            },
        )

    def test_issue_78_circuits_10th(self):
        self.assertEqual(
            self.relationshipsFlat(
                "judicial_circuits",
                "subnational_regions",
                lambda g: g.startswith("10th Circuit"),
            ),
            {
                # contains
                ("10th Circuit, USA", "Wyoming, USA", "a_contains_b"),
                ("10th Circuit, USA", "Utah, USA", "a_contains_b"),
                ("10th Circuit, USA", "Colorado, USA", "a_contains_b"),
                ("10th Circuit, USA", "Kansas, USA", "a_contains_b"),
                ("10th Circuit, USA", "New Mexico, USA", "a_contains_b"),
                ("10th Circuit, USA", "Oklahoma, USA", "a_contains_b"),
                # borders
                ("10th Circuit, USA", "Montana, USA", "borders"),
                ("10th Circuit, USA", "South Dakota, USA", "borders"),
                ("10th Circuit, USA", "Nebraska, USA", "borders"),
                ("10th Circuit, USA", "Missouri, USA", "borders"),
                ("10th Circuit, USA", "Arkansas, USA", "borders"),
                ("10th Circuit, USA", "Texas, USA", "borders"),
                ("10th Circuit, USA", "Chihuahua, Mexico", "borders"),
                ("10th Circuit, USA", "Sonora, Mexico", "borders"),
                ("10th Circuit, USA", "Arizona, USA", "borders"),
                ("10th Circuit, USA", "Nevada, USA", "borders"),
                ("10th Circuit, USA", "Idaho, USA", "borders"),
            },
        )
