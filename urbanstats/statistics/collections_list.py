from urbanstats.statistics.collections.housing_rent import HousingRent
from urbanstats.statistics.collections.housing_rent_burden import HousingRentBurden
from urbanstats.statistics.collections.housing_rent_or_own import HousingRentOrOwn
from urbanstats.statistics.collections.housing_year_built import (
    HousingYearBuiltStatistics,
)
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
    HousingRentOrOwn(),
    HousingRentBurden(),
    HousingRent(),
    HousingYearBuiltStatistics(),
    TransportationModeStatistics(),
    TransportationCommuteTimeStatistics(),
    TransportationVehicleOwnershipStatistics(),
)
