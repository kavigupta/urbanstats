from urbanstats.statistics.collections.education_statistics import EducationStatistics
from urbanstats.statistics.collections.education_gender_gap import (
    EducationGenderGapStatistics,
)
from urbanstats.statistics.collections.generation import GenerationStatistics
from urbanstats.statistics.collections.housing_census import HousingCensus
from urbanstats.statistics.collections.housing_rent import HousingRent
from urbanstats.statistics.collections.housing_rent_burden import HousingRentBurden
from urbanstats.statistics.collections.housing_rent_or_own import HousingRentOrOwn
from urbanstats.statistics.collections.housing_year_built import (
    HousingYearBuiltStatistics,
)
from urbanstats.statistics.collections.income_family import IncomeFamily
from urbanstats.statistics.collections.income_individual import IncomeIndividual
from urbanstats.statistics.collections.income_poverty import IncomePoverty
from urbanstats.statistics.collections.transportation_commute_time import (
    TransportationCommuteTimeStatistics,
)
from urbanstats.statistics.collections.transportation_mode import (
    TransportationModeStatistics,
)
from urbanstats.statistics.collections.transportation_vehicle_ownership import (
    TransportationVehicleOwnershipStatistics,
)


statistic_collections = (
    EducationStatistics(),
    EducationGenderGapStatistics(),
    GenerationStatistics(),
    IncomePoverty(),
    IncomeFamily(),
    IncomeIndividual(),
    HousingCensus(),
    HousingRentOrOwn(),
    HousingRentBurden(),
    HousingRent(),
    HousingYearBuiltStatistics(),
    TransportationModeStatistics(),
    TransportationCommuteTimeStatistics(),
    TransportationVehicleOwnershipStatistics(),
)
