from urbanstats.statistics.collections.housing_year_built import HousingYearBuiltStatistics
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
    HousingYearBuiltStatistics(),
    TransportationModeStatistics(),
    TransportationCommuteTimeStatistics(),
    TransportationVehicleOwnershipStatistics(),
)
