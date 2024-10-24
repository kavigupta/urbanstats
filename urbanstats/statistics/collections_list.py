from urbanstats.statistics.collections.cdc_statistics import CDCStatistics
from urbanstats.statistics.collections.census_2010 import Census2000, Census2010
from urbanstats.statistics.collections.census_basics import CensusBasics
from urbanstats.statistics.collections.education_gender_gap import (
    EducationGenderGapStatistics,
)
from urbanstats.statistics.collections.education_statistics import EducationStatistics
from urbanstats.statistics.collections.feature import USFeatureDistanceStatistics
from urbanstats.statistics.collections.generation import GenerationStatistics
from urbanstats.statistics.collections.geographic import AreaAndCompactnessStatistics
from urbanstats.statistics.collections.gpw import GPWStatistics
from urbanstats.statistics.collections.heating import HouseHeating
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
from urbanstats.statistics.collections.industry import IndustryStatistics
from urbanstats.statistics.collections.insurance_type import InsuranceTypeStatistics
from urbanstats.statistics.collections.internet_access import InternetAccessStatistics
from urbanstats.statistics.collections.marriage import MarriageStatistics
from urbanstats.statistics.collections.national_origin_birthplace import (
    NationalOriginBirthplaceStatistics,
)
from urbanstats.statistics.collections.national_origin_citizenship import (
    NationalOriginCitizenshipStatistics,
)
from urbanstats.statistics.collections.national_origin_language import (
    NationalOriginLanguageStatistics,
)
from urbanstats.statistics.collections.occupation import OccupationStatistics
from urbanstats.statistics.collections.race_census import RaceCensus
from urbanstats.statistics.collections.segregation import SegregationStatistics
from urbanstats.statistics.collections.sexual_orientation_and_relationship_status import (
    SexualOrientationRelationshipStatusStatistics,
)
from urbanstats.statistics.collections.traffic_accidents import NHTSAAccidentStatistics
from urbanstats.statistics.collections.transportation_commute_time import (
    TransportationCommuteTimeStatistics,
)
from urbanstats.statistics.collections.transportation_mode import (
    TransportationModeStatistics,
)
from urbanstats.statistics.collections.transportation_vehicle_ownership import (
    TransportationVehicleOwnershipStatistics,
)
from urbanstats.statistics.collections.us_election import USElectionStatistics
from urbanstats.statistics.collections.usda_fra_statistics import USDAFRAStatistics
from urbanstats.statistics.collections.weather import USWeatherStatistics

statistic_collections = (
    CensusBasics(),
    RaceCensus(),
    HousingCensus(),
    Census2010(),
    Census2000(),
    GPWStatistics(),
    AreaAndCompactnessStatistics(),
    SegregationStatistics(),
    NationalOriginCitizenshipStatistics(),
    NationalOriginBirthplaceStatistics(),
    NationalOriginLanguageStatistics(),
    EducationStatistics(),
    EducationGenderGapStatistics(),
    GenerationStatistics(),
    IncomePoverty(),
    IncomeFamily(),
    IncomeIndividual(),
    HousingRentOrOwn(),
    HousingRentBurden(),
    HousingRent(),
    HousingYearBuiltStatistics(),
    TransportationModeStatistics(),
    TransportationCommuteTimeStatistics(),
    TransportationVehicleOwnershipStatistics(),
    NHTSAAccidentStatistics(),
    CDCStatistics(),
    HouseHeating(),
    IndustryStatistics(),
    OccupationStatistics(),
    SexualOrientationRelationshipStatusStatistics(),
    USElectionStatistics(),
    USFeatureDistanceStatistics(),
    USDAFRAStatistics(),
    USWeatherStatistics(),
    InternetAccessStatistics(),
    InsuranceTypeStatistics(),
    MarriageStatistics(),
)
