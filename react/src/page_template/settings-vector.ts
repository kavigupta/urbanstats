/**
 * When we save settings, we put them in a bit vector
 */

import * as base58 from 'base58-js'

import { defaultSettingsList, RelationshipKey, Settings, SettingsDictionary, StatCategoryExpandedKey, StatCategorySavedIndeterminateKey, useSettings } from './settings'

interface ActiveSettingCoder<K extends keyof SettingsDictionary> {
    encode(value: SettingsDictionary[K]): boolean[]
    decode(bits: boolean[], settings: Settings): SettingsDictionary[K]
    key: K
    deprecated: false
}

class DeprecatedSettingCoder<const K extends string> {
    constructor(readonly props: { key: K, bits: number }) {} // How many bits is our data going to consume

    encode(): boolean[] {
        return Array.from({ length: this.props.bits }).map(() => false)
    }

    decode(bits: boolean[]): void {
        // Need to use the bits, but don't care about the result
        for (let i = 0; i < this.props.bits; i++) {
            bits.shift()
        }
    }

    get key(): K {
        return this.props.key
    }

    readonly deprecated = true
}

type BooleanSettingKey = keyof { [K in keyof SettingsDictionary as SettingsDictionary[K] extends boolean ? K : never]: boolean }

class BooleanSettingCoder<const K extends BooleanSettingKey> implements ActiveSettingCoder<BooleanSettingKey> {
    constructor(readonly props: { key: K }) {}

    readonly deprecated = false

    encode(value: boolean): boolean[] {
        return [value]
    }

    decode(bits: boolean[], settings: Settings): boolean {
        const result = bits.shift()
        if (result === undefined) {
            return settings.get(this.props.key)
        }
        return result
    }

    get key(): K { return this.props.key }
}

/**
 * DO NOT REORDER, ONLY ADD
 *
 * This vector represents setting values encoded as bit vectors in hyperlinks.
 */
const settingsVector = [
    new BooleanSettingCoder({ key: 'show_stat_group_population' }),
    new BooleanSettingCoder({ key: 'show_stat_group_ad_1' }),
    new BooleanSettingCoder({ key: 'show_stat_group_sd' }),
    new BooleanSettingCoder({ key: 'show_stat_group_area' }),
    new BooleanSettingCoder({ key: 'show_stat_group_compactness' }),
    new DeprecatedSettingCoder({ key: 'show_stat_group_gpw_population', bits: 1 }),
    new DeprecatedSettingCoder({ key: 'show_stat_group_gpw_pw_density_1', bits: 1 }),
    new DeprecatedSettingCoder({ key: 'show_stat_group_gpw_aw_density', bits: 1 }),
    new BooleanSettingCoder({ key: 'show_stat_group_white' }),
    new BooleanSettingCoder({ key: 'show_stat_group_hispanic' }),
    new BooleanSettingCoder({ key: 'show_stat_group_black' }),
    new BooleanSettingCoder({ key: 'show_stat_group_asian' }),
    new BooleanSettingCoder({ key: 'show_stat_group_native' }),
    new BooleanSettingCoder({ key: 'show_stat_group_hawaiian_pi' }),
    new BooleanSettingCoder({ key: 'show_stat_group_other  slash  mixed' }),
    new BooleanSettingCoder({ key: 'show_stat_group_homogeneity_250' }),
    new BooleanSettingCoder({ key: 'show_stat_group_segregation_250' }),
    new BooleanSettingCoder({ key: 'show_stat_group_segregation_250_10' }),
    new BooleanSettingCoder({ key: 'show_stat_group_citizenship_citizen_by_birth' }),
    new BooleanSettingCoder({ key: 'show_stat_group_citizenship_citizen_by_naturalization' }),
    new BooleanSettingCoder({ key: 'show_stat_group_citizenship_not_citizen' }),
    new BooleanSettingCoder({ key: 'show_stat_group_birthplace_non_us' }),
    new BooleanSettingCoder({ key: 'show_stat_group_birthplace_us_not_state' }),
    new BooleanSettingCoder({ key: 'show_stat_group_birthplace_us_state' }),
    new BooleanSettingCoder({ key: 'show_stat_group_language_english_only' }),
    new BooleanSettingCoder({ key: 'show_stat_group_language_spanish' }),
    new BooleanSettingCoder({ key: 'show_stat_group_language_other' }),
    new BooleanSettingCoder({ key: 'show_stat_group_education_high_school' }),
    new BooleanSettingCoder({ key: 'show_stat_group_education_ugrad' }),
    new BooleanSettingCoder({ key: 'show_stat_group_education_grad' }),
    new BooleanSettingCoder({ key: 'show_stat_group_education_field_stem' }),
    new BooleanSettingCoder({ key: 'show_stat_group_education_field_humanities' }),
    new BooleanSettingCoder({ key: 'show_stat_group_education_field_business' }),
    new BooleanSettingCoder({ key: 'show_stat_group_female_hs_gap_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_female_ugrad_gap_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_female_grad_gap_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_generation_silent' }),
    new BooleanSettingCoder({ key: 'show_stat_group_generation_boomer' }),
    new BooleanSettingCoder({ key: 'show_stat_group_generation_genx' }),
    new BooleanSettingCoder({ key: 'show_stat_group_generation_millenial' }),
    new BooleanSettingCoder({ key: 'show_stat_group_generation_genz' }),
    new BooleanSettingCoder({ key: 'show_stat_group_generation_genalpha' }),
    new BooleanSettingCoder({ key: 'show_stat_group_poverty_below_line' }),
    new BooleanSettingCoder({ key: 'show_stat_group_household_income_under_50k' }),
    new BooleanSettingCoder({ key: 'show_stat_group_household_income_50k_to_100k' }),
    new BooleanSettingCoder({ key: 'show_stat_group_household_income_over_100k' }),
    new BooleanSettingCoder({ key: 'show_stat_group_individual_income_under_50k' }),
    new BooleanSettingCoder({ key: 'show_stat_group_individual_income_50k_to_100k' }),
    new BooleanSettingCoder({ key: 'show_stat_group_individual_income_over_100k' }),
    new BooleanSettingCoder({ key: 'show_stat_group_housing_per_pop' }),
    new BooleanSettingCoder({ key: 'show_stat_group_vacancy' }),
    new BooleanSettingCoder({ key: 'show_stat_group_rent_burden_under_20' }),
    new BooleanSettingCoder({ key: 'show_stat_group_rent_burden_20_to_40' }),
    new BooleanSettingCoder({ key: 'show_stat_group_rent_burden_over_40' }),
    new BooleanSettingCoder({ key: 'show_stat_group_rent_1br_under_750' }),
    new BooleanSettingCoder({ key: 'show_stat_group_rent_1br_750_to_1500' }),
    new BooleanSettingCoder({ key: 'show_stat_group_rent_1br_over_1500' }),
    new BooleanSettingCoder({ key: 'show_stat_group_rent_2br_under_750' }),
    new BooleanSettingCoder({ key: 'show_stat_group_rent_2br_750_to_1500' }),
    new BooleanSettingCoder({ key: 'show_stat_group_rent_2br_over_1500' }),
    new BooleanSettingCoder({ key: 'show_stat_group_year_built_1969_or_earlier' }),
    new BooleanSettingCoder({ key: 'show_stat_group_year_built_1970_to_1979' }),
    new BooleanSettingCoder({ key: 'show_stat_group_year_built_1980_to_1989' }),
    new BooleanSettingCoder({ key: 'show_stat_group_year_built_1990_to_1999' }),
    new BooleanSettingCoder({ key: 'show_stat_group_year_built_2000_to_2009' }),
    new BooleanSettingCoder({ key: 'show_stat_group_year_built_2010_or_later' }),
    new BooleanSettingCoder({ key: 'show_stat_group_rent_or_own_rent' }),
    new BooleanSettingCoder({ key: 'show_stat_group_transportation_means_car' }),
    new BooleanSettingCoder({ key: 'show_stat_group_transportation_means_bike' }),
    new BooleanSettingCoder({ key: 'show_stat_group_transportation_means_walk' }),
    new BooleanSettingCoder({ key: 'show_stat_group_transportation_means_transit' }),
    new BooleanSettingCoder({ key: 'show_stat_group_transportation_means_worked_at_home' }),
    new BooleanSettingCoder({ key: 'show_stat_group_transportation_commute_time_under_15' }),
    new BooleanSettingCoder({ key: 'show_stat_group_transportation_commute_time_15_to_29' }),
    new BooleanSettingCoder({ key: 'show_stat_group_transportation_commute_time_30_to_59' }),
    new BooleanSettingCoder({ key: 'show_stat_group_transportation_commute_time_over_60' }),
    new BooleanSettingCoder({ key: 'show_stat_group_vehicle_ownership_none' }),
    new BooleanSettingCoder({ key: 'show_stat_group_vehicle_ownership_at_least_1' }),
    new BooleanSettingCoder({ key: 'show_stat_group_vehicle_ownership_at_least_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_traffic_fatalities_last_decade_per_capita' }),
    new BooleanSettingCoder({ key: 'show_stat_group_traffic_fatalities_ped_last_decade_per_capita' }),
    new BooleanSettingCoder({ key: 'show_stat_group_traffic_fatalities_last_decade' }),
    new BooleanSettingCoder({ key: 'show_stat_group_traffic_fatalities_ped_last_decade' }),
    new BooleanSettingCoder({ key: 'show_stat_group_GHLTH_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_PHLTH_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_ARTHRITIS_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_CASTHMA_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_BPHIGH_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_CANCER_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_KIDNEY_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_COPD_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_CHD_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_DIABETES_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_OBESITY_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_STROKE_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_DISABILITY_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_HEARING_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_VISION_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_COGNITION_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_MOBILITY_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_SELFCARE_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_INDEPLIVE_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_BINGE_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_CSMOKING_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_LPA_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_SLEEP_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_CHECKUP_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_DENTAL_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_CHOLSCREEN_cdc_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_heating_utility_gas' }),
    new BooleanSettingCoder({ key: 'show_stat_group_heating_electricity' }),
    new BooleanSettingCoder({ key: 'show_stat_group_heating_bottled_tank_lp_gas' }),
    new BooleanSettingCoder({ key: 'show_stat_group_heating_feul_oil_kerosene' }),
    new BooleanSettingCoder({ key: 'show_stat_group_heating_other' }),
    new BooleanSettingCoder({ key: 'show_stat_group_heating_no' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_agriculture,_forestry,_fishing_and_hunting' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_mining,_quarrying,_and_oil_and_gas_extraction' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_accommodation_and_food_services' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_arts,_entertainment,_and_recreation' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_construction' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_educational_services' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_health_care_and_social_assistance' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_finance_and_insurance' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_real_estate_and_rental_and_leasing' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_information' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_manufacturing' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_other_services,_except_public_administration' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_administrative_and_support_and_waste_management_services' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_management_of_companies_and_enterprises' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_professional,_scientific,_and_technical_services' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_public_administration' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_retail_trade' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_transportation_and_warehousing' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_utilities' }),
    new BooleanSettingCoder({ key: 'show_stat_group_industry_wholesale_trade' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_architecture_and_engineering_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_computer_and_mathematical_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_life,_physical,_and_social_science_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_arts,_design,_entertainment,_sports,_and_media_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_community_and_social_service_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_educational_instruction,_and_library_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_legal_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_health_technologists_and_technicians' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_business_and_financial_operations_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_management_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_construction_and_extraction_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_farming,_fishing,_and_forestry_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_installation,_maintenance,_and_repair_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_material_moving_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_production_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_transportation_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_office_and_administrative_support_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_sales_and_related_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_building_and_grounds_cleaning_and_maintenance_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_food_preparation_and_serving_related_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_healthcare_support_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_personal_care_and_service_occupations' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors' }),
    new BooleanSettingCoder({ key: 'show_stat_group_occupation_law_enforcement_workers_including_supervisors' }),
    new BooleanSettingCoder({ key: 'show_stat_group_sors_unpartnered_householder' }),
    new BooleanSettingCoder({ key: 'show_stat_group_sors_cohabiting_partnered_gay' }),
    new BooleanSettingCoder({ key: 'show_stat_group_sors_cohabiting_partnered_straight' }),
    new BooleanSettingCoder({ key: 'show_stat_group_sors_child' }),
    new BooleanSettingCoder({ key: 'show_stat_group_sors_other' }),
    new BooleanSettingCoder({ key: 'show_stat_group_marriage_never_married' }),
    new BooleanSettingCoder({ key: 'show_stat_group_marriage_married_not_divorced' }),
    new BooleanSettingCoder({ key: 'show_stat_group_marriage_divorced' }),
    new BooleanSettingCoder({ key: 'show_stat_group_2020 Presidential Election-margin' }),
    new BooleanSettingCoder({ key: 'show_stat_group_2016 Presidential Election-margin' }),
    new BooleanSettingCoder({ key: 'show_stat_group_2016-2020 Swing-margin' }),
    new BooleanSettingCoder({ key: 'show_stat_group_park_percent_1km_v2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_within_Hospital_10' }),
    new BooleanSettingCoder({ key: 'show_stat_group_mean_dist_Hospital_updated' }),
    new BooleanSettingCoder({ key: 'show_stat_group_within_Public School_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_mean_dist_Public School_updated' }),
    new BooleanSettingCoder({ key: 'show_stat_group_within_Airport_30' }),
    new BooleanSettingCoder({ key: 'show_stat_group_mean_dist_Airport_updated' }),
    new BooleanSettingCoder({ key: 'show_stat_group_within_Active Superfund Site_10' }),
    new BooleanSettingCoder({ key: 'show_stat_group_mean_dist_Active Superfund Site_updated' }),
    new BooleanSettingCoder({ key: 'show_stat_group_lapophalfshare_usda_fra_1' }),
    new BooleanSettingCoder({ key: 'show_stat_group_lapop1share_usda_fra_1' }),
    new BooleanSettingCoder({ key: 'show_stat_group_lapop10share_usda_fra_1' }),
    new BooleanSettingCoder({ key: 'show_stat_group_lapop20share_usda_fra_1' }),
    new BooleanSettingCoder({ key: 'show_stat_group_mean_high_temp_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_mean_high_heat_index_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_mean_high_dewpoint_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_days_above_90_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_days_between_40_and_90_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_days_below_40_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_days_dewpoint_70_inf_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_days_dewpoint_50_70_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_days_dewpoint_-inf_50_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_hours_sunny_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_rainfall_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_snowfall_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_wind_speed_over_10mph_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_mean_high_temp_summer_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_mean_high_temp_winter_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_mean_high_temp_fall_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_mean_high_temp_spring_4' }),
    new BooleanSettingCoder({ key: 'show_stat_group_internet_no_access' }),
    new BooleanSettingCoder({ key: 'show_stat_group_insurance_coverage_none' }),
    new BooleanSettingCoder({ key: 'show_stat_group_insurance_coverage_govt' }),
    new BooleanSettingCoder({ key: 'show_stat_group_insurance_coverage_private' }),
    new BooleanSettingCoder({ key: 'show_stat_group_ad_0.25' }),
    new BooleanSettingCoder({ key: 'show_stat_group_ad_0.5' }),
    new BooleanSettingCoder({ key: 'show_stat_group_ad_2' }),
    new BooleanSettingCoder({ key: 'show_stat_group_ad_4' }),
    new DeprecatedSettingCoder({ key: 'show_stat_group_gpw_pw_density_2', bits: 1 }),
    new DeprecatedSettingCoder({ key: 'show_stat_group_gpw_pw_density_4', bits: 1 }),
    new BooleanSettingCoder({ key: 'show_stat_year_2020' }),
    new BooleanSettingCoder({ key: 'show_stat_year_2010' }),
    new BooleanSettingCoder({ key: 'show_stat_year_2000' }),
    new BooleanSettingCoder({ key: 'show_historical_cds' }),
    new BooleanSettingCoder({ key: 'simple_ordinals' }),
    new BooleanSettingCoder({ key: 'use_imperial' }),
    new BooleanSettingCoder({ key: 'show_stat_source_Population_US Census' }),
    new BooleanSettingCoder({ key: 'show_stat_source_Population_GHSL' }),
    new BooleanSettingCoder({ key: 'expanded__ad_0.25' }),
    new BooleanSettingCoder({ key: 'expanded__ad_0.25_2000' }),
    new BooleanSettingCoder({ key: 'expanded__ad_0.25_2010' }),
    new BooleanSettingCoder({ key: 'expanded__ad_0.5' }),
    new BooleanSettingCoder({ key: 'expanded__ad_0.5_2000' }),
    new BooleanSettingCoder({ key: 'expanded__ad_0.5_2010' }),
    new BooleanSettingCoder({ key: 'expanded__ad_1' }),
    new BooleanSettingCoder({ key: 'expanded__ad_1_2000' }),
    new BooleanSettingCoder({ key: 'expanded__ad_1_2010' }),
    new BooleanSettingCoder({ key: 'expanded__ad_2' }),
    new BooleanSettingCoder({ key: 'expanded__ad_2_2000' }),
    new BooleanSettingCoder({ key: 'expanded__ad_2_2010' }),
    new BooleanSettingCoder({ key: 'expanded__ad_4' }),
    new BooleanSettingCoder({ key: 'expanded__ad_4_2000' }),
    new BooleanSettingCoder({ key: 'expanded__ad_4_2010' }),
    new BooleanSettingCoder({ key: 'expanded__gpw_pw_density_1' }),
    new BooleanSettingCoder({ key: 'expanded__gpw_pw_density_2' }),
    new BooleanSettingCoder({ key: 'expanded__gpw_pw_density_4' }),
    new BooleanSettingCoder({ key: 'histogram_relative' }),
] satisfies (ActiveSettingCoder<keyof SettingsDictionary> | DeprecatedSettingCoder<string>)[]

type NotIncludedInSettingsVector = (
    RelationshipKey
    | StatCategorySavedIndeterminateKey
    | StatCategoryExpandedKey
    | 'histogram_type'
    | 'theme' | 'colorblind_mode' | 'clean_background'
)

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- No deprecations yet
const activeVectorKeys = settingsVector.flatMap(setting => setting.deprecated ? [] : [setting.key])

export type VectorSettingKey = typeof activeVectorKeys[number]

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Just for checking type
function justForCheckingType(): (VectorSettingKey | NotIncludedInSettingsVector)[] {
    return (defaultSettingsList.map(([x]) => x) satisfies (VectorSettingKey | NotIncludedInSettingsVector)[])
}

type Overlap = VectorSettingKey & NotIncludedInSettingsVector
type CheckOverlap = [Overlap] extends [never] ? 'no overlap' : 'overlap'

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Just for checking type
const checkOverlap: CheckOverlap = 'no overlap'

export function useVector(): string {
    const settings = useSettings(activeVectorKeys)
    const booleans = settingsVector.flatMap((coder) => {
        if (coder.deprecated) {
            return coder.encode()
        }
        return coder.encode(settings[coder.key])
    })
    return base58.binary_to_base58(compressBooleans(booleans))
}

export function fromVector(vector: string, settings: Settings): { [K in VectorSettingKey]: SettingsDictionary[K] } {
    const array = decompressBooleans(base58.base58_to_binary(vector))
    const result = settingsVector.flatMap((coder) => {
        if (coder.deprecated) {
            return []
        }
        return [[coder.key, coder.decode(array, settings)]] as const
    })
    return Object.fromEntries(result)
}

/*
 * Compression encoding (little endian):
 * Byte that starts with 0 represents 7 bits in sequence (the rest of the the byte)
 * Byte that starts with 1 represents x bits with value v, where v is the second bit of the byte, and x is the number made out of the last 6 bits
 */
function compressBooleans(booleans: boolean[]): number[] {
    const result: number[] = []
    const paddedBooleans = [...booleans, true] // Add a true to the end so we know when to stop when decompressing
    let i = 0
    let bit = 8
    while (i < paddedBooleans.length) {
        if (bit === 8) {
            const value = paddedBooleans[i]
            let run = i + 1
            while (paddedBooleans[run] === value && run - i < 63) {
                run++
            }
            if (run - i > 7) {
                result.push(1 | ((value ? 1 : 0) << 1) | (run - i) << 2)
                i = run
                continue
            }
        }

        if (bit === 8) {
            result.push(0)
            bit = 1 // since this is a heterogeneous byte that starts with 0
        }
        result[result.length - 1] |= (paddedBooleans[i] ? 1 : 0) << bit
        i++
        bit++
    }
    return result
}

function decompressBooleans(bytes: Uint8Array): boolean[] {
    const result: boolean[] = []
    for (const byte of bytes) {
        if ((byte & 1) === 1) {
            const value = ((byte >> 1) & 1) === 1
            const num = byte >> 2
            for (let i = 0; i < num; i++) {
                result.push(value)
            }
        }
        else {
            for (let bit = 1; bit < 8; bit++) {
                result.push(((byte >> bit) & 1) === 1)
            }
        }
    }
    return result.slice(0, result.lastIndexOf(true))
}
