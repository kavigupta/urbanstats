from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class CrossSourceBorders:
    """
    What happens to a shapefile's regions when a statistic covers only one country.

    Statistics sourced from a single country's statistics agency are computed on the subset
    of a shapefile inside that country (see `compute_subset_statistics`). A region a
    filtering subset mask drops has no value for those statistics at all, so it vanishes
    from rankings of them with nothing to say why.
    """

    can_straddle: bool
    alternative_geography_types: List[str] = field(default_factory=list)
    reason_for_no_alternatives: Optional[str] = None

    def __post_init__(self):
        if not self.can_straddle:
            assert not self.alternative_geography_types, (
                "a type whose regions cannot straddle a border needs no alternatives:"
                f" {self.alternative_geography_types}"
            )
            assert self.reason_for_no_alternatives is None, (
                "a type whose regions cannot straddle a border has nothing to explain:"
                f" {self.reason_for_no_alternatives!r}"
            )
        elif self.alternative_geography_types:
            assert self.reason_for_no_alternatives is None, (
                "reason_for_no_alternatives is for types with no alternatives, but this one"
                f" has {self.alternative_geography_types}"
            )
        else:
            assert self.reason_for_no_alternatives is not None, (
                "a straddling type with no alternatives must say why in"
                " reason_for_no_alternatives"
            )
