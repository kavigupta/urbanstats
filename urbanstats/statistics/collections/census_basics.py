from abc import abstractmethod

import numpy as np

from urbanstats.data.census_blocks import RADII, format_radius
from urbanstats.data.gpw import median_from_histogram
from urbanstats.games.quiz_question_metadata import (
    POPULATION,
    POPULATION_DENSITY,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.collections.census import DENSITY_EXPLANATION_PW
from urbanstats.statistics.extra_statistics import HistogramSpec


class CensusBasicsMixin:
    """
    Population and density from a national census's blocks, for countries other than the US.
    Columns are named e.g. density_{year}_pw_{r}_{suffix}.
    """

    suffix: str
    source_name: str
    explanation_page: str
    # the first year is the one shown by default, and the only one with a median point
    census_years: tuple
    # appended to mapper variable names, which are shared with the US
    varname_year_suffix: dict

    @abstractmethod
    def census_stats(self, year, shapefile):
        """Per-region sums of population and of each {suffix}_density_{year}_{r} column."""

    @abstractmethod
    def census_histograms(self, year, shapefile):
        """longname -> {suffix}_density_{year}_{r} -> histogram, for populated regions."""

    @abstractmethod
    def census_median_point(self, shapefile):
        """Per-region lat and lon columns."""

    def _year_label(self, year):
        return "" if year == self.census_years[0] else f" ({year})"

    def name_for_each_statistic(self):
        s, src = self.suffix, self.source_name
        result = {}
        for year in self.census_years:
            label = self._year_label(year)
            result[f"population_{year}_{s}"] = f"Population{label} [{src}]"
            result.update(
                {
                    f"density_{year}_pw_{r}_{s}": f"PW Density ({format_radius(r)}){label} [{src}]"
                    for r in RADII
                }
            )
            result[f"sd_{year}_{s}"] = f"Area-weighted Density{label} [{src}]"
            result[
                f"density_{year}_pw_median_1_{s}"
            ] = f"PW Median Density (1km){label} [{src}]"
        return result

    def unit_for_each_statistic(self):
        return {
            k: "population" if k.startswith("population") else "density"
            for k in self.name_for_each_statistic()
        }

    def varname_for_each_statistic(self):
        s = self.suffix
        result = {}
        for year in self.census_years:
            var_year_suffix = self.varname_year_suffix[year]
            result.update(
                {
                    f"population_{year}_{s}": f"population{var_year_suffix}",
                    **{
                        f"density_{year}_pw_{r}_{s}": f"density_pw_{format_radius(r)}{var_year_suffix}"
                        for r in RADII
                    },
                    f"sd_{year}_{s}": f"density_aw{var_year_suffix}",
                    f"density_{year}_pw_median_1_{s}": f"density_pw_median_1km{var_year_suffix}",
                }
            )
        return result

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name(self.explanation_page)

    def quiz_question_descriptors(self):
        year, s = self.census_years[0], self.suffix
        result = {
            f"population_{year}_{s}": QuizQuestionDescriptor(
                "higher population",
                POPULATION,
                exclude_geography_types=("Subnational Region",),
            ),
            f"density_{year}_pw_1_{s}": QuizQuestionDescriptor(
                "higher population-weighted density (r=1km)" + DENSITY_EXPLANATION_PW,
                POPULATION_DENSITY,
            ),
        }
        for k in self.name_for_each_statistic():
            if k not in result:
                result[k] = QuizQuestionSkip()
        return result

    def dependencies(self):
        return ["area"]

    def compute_census_basics(self, *, shapefile, existing_statistics, shapefile_table):
        s = self.suffix
        results = {}
        for year in self.census_years:
            st = self.census_stats(year, shapefile)
            results[f"population_{year}_{s}"] = st["population"]
            results[f"sd_{year}_{s}"] = st["population"] / existing_statistics["area"]
            for r in RADII:
                results[f"density_{year}_pw_{r}_{s}"] = (
                    st[f"{s}_density_{year}_{r}"] / st["population"]
                )
            histos = self.census_histograms(year, shapefile)
            results.update({f"pw_density_{year}_histogram_{r}_{s}": [] for r in RADII})
            for idx, longname in enumerate(shapefile_table.longname):
                for r in RADII:
                    if longname not in histos:
                        assert st["population"][idx] == 0
                        results[f"pw_density_{year}_histogram_{r}_{s}"].append(np.nan)
                    else:
                        results[f"pw_density_{year}_histogram_{r}_{s}"].append(
                            histos[longname][f"{s}_density_{year}_{r}"]
                        )
            results[f"density_{year}_pw_median_1_{s}"] = [
                median_from_histogram(h)
                for h in results[f"pw_density_{year}_histogram_1_{s}"]
            ]
        median = self.census_median_point(shapefile)
        results[f"population_median_lat_{s}"] = median["lat"]
        results[f"population_median_lon_{s}"] = median["lon"]
        for k in self.name_for_each_statistic():
            assert k in results, f"Missing statistic {k}"
        return results

    def extra_stats(self):
        s = self.suffix
        return {
            f"density_{year}_pw_{r}_{s}": HistogramSpec(
                0,
                0.1,
                f"pw_density_{year}_histogram_{r}_{s}",
                f"population_{year}_{s}",
            )
            for r in RADII
            for year in self.census_years
        }
