/**
 * When we save settings, we put them in a bit vector
 */

import * as base58 from 'base58-js'

import { defaultSettingsList, RelationshipKey, Settings, SettingsDictionary, StatCategoryExpandedKey, StatCategorySavedIndeterminateKey, useSettings } from './settings'

export type BooleanSettingKey = keyof { [K in keyof SettingsDictionary as SettingsDictionary[K] extends boolean ? K : never]: boolean }

/**
 * DO NOT REORDER, ONLY ADD
 *
 * This vector represents setting values encoded as bit vectors in hyperlinks.
 */
const settingsVector = [
    { key: `show_stat_group_population`, deprecated: false },
    { key: `show_stat_group_ad_1`, deprecated: false },
    { key: `show_stat_group_sd`, deprecated: false },
    { key: `show_stat_group_area`, deprecated: false },
    { key: `show_stat_group_compactness`, deprecated: false },
    { key: `show_stat_group_gpw_population`, deprecated: true },
    { key: `show_stat_group_gpw_pw_density_1`, deprecated: true },
    { key: `show_stat_group_gpw_aw_density`, deprecated: true },
    { key: `show_stat_group_white`, deprecated: false },
    { key: `show_stat_group_hispanic`, deprecated: false },
    { key: `show_stat_group_black`, deprecated: false },
    { key: `show_stat_group_asian`, deprecated: false },
    { key: `show_stat_group_native`, deprecated: false },
    { key: `show_stat_group_hawaiian_pi`, deprecated: false },
    { key: `show_stat_group_other  slash  mixed`, deprecated: false },
    { key: `show_stat_group_homogeneity_250`, deprecated: false },
    { key: `show_stat_group_segregation_250`, deprecated: false },
    { key: `show_stat_group_segregation_250_10`, deprecated: false },
    { key: `show_stat_group_citizenship_citizen_by_birth`, deprecated: false },
    { key: `show_stat_group_citizenship_citizen_by_naturalization`, deprecated: false },
    { key: `show_stat_group_citizenship_not_citizen`, deprecated: false },
    { key: `show_stat_group_birthplace_non_us`, deprecated: false },
    { key: `show_stat_group_birthplace_us_not_state`, deprecated: false },
    { key: `show_stat_group_birthplace_us_state`, deprecated: false },
    { key: `show_stat_group_language_english_only`, deprecated: false },
    { key: `show_stat_group_language_spanish`, deprecated: false },
    { key: `show_stat_group_language_other`, deprecated: false },
    { key: `show_stat_group_education_high_school`, deprecated: false },
    { key: `show_stat_group_education_ugrad`, deprecated: false },
    { key: `show_stat_group_education_grad`, deprecated: false },
    { key: `show_stat_group_education_field_stem`, deprecated: false },
    { key: `show_stat_group_education_field_humanities`, deprecated: false },
    { key: `show_stat_group_education_field_business`, deprecated: false },
    { key: `show_stat_group_female_hs_gap_4`, deprecated: false },
    { key: `show_stat_group_female_ugrad_gap_4`, deprecated: false },
    { key: `show_stat_group_female_grad_gap_4`, deprecated: false },
    { key: `show_stat_group_generation_silent`, deprecated: false },
    { key: `show_stat_group_generation_boomer`, deprecated: false },
    { key: `show_stat_group_generation_genx`, deprecated: false },
    { key: `show_stat_group_generation_millenial`, deprecated: false },
    { key: `show_stat_group_generation_genz`, deprecated: false },
    { key: `show_stat_group_generation_genalpha`, deprecated: false },
    { key: `show_stat_group_poverty_below_line`, deprecated: false },
    { key: `show_stat_group_household_income_under_50k`, deprecated: false },
    { key: `show_stat_group_household_income_50k_to_100k`, deprecated: false },
    { key: `show_stat_group_household_income_over_100k`, deprecated: false },
    { key: `show_stat_group_individual_income_under_50k`, deprecated: false },
    { key: `show_stat_group_individual_income_50k_to_100k`, deprecated: false },
    { key: `show_stat_group_individual_income_over_100k`, deprecated: false },
    { key: `show_stat_group_housing_per_pop`, deprecated: false },
    { key: `show_stat_group_vacancy`, deprecated: false },
    { key: `show_stat_group_rent_burden_under_20`, deprecated: false },
    { key: `show_stat_group_rent_burden_20_to_40`, deprecated: false },
    { key: `show_stat_group_rent_burden_over_40`, deprecated: false },
    { key: `show_stat_group_rent_1br_under_750`, deprecated: false },
    { key: `show_stat_group_rent_1br_750_to_1500`, deprecated: false },
    { key: `show_stat_group_rent_1br_over_1500`, deprecated: false },
    { key: `show_stat_group_rent_2br_under_750`, deprecated: false },
    { key: `show_stat_group_rent_2br_750_to_1500`, deprecated: false },
    { key: `show_stat_group_rent_2br_over_1500`, deprecated: false },
    { key: `show_stat_group_year_built_1969_or_earlier`, deprecated: false },
    { key: `show_stat_group_year_built_1970_to_1979`, deprecated: false },
    { key: `show_stat_group_year_built_1980_to_1989`, deprecated: false },
    { key: `show_stat_group_year_built_1990_to_1999`, deprecated: false },
    { key: `show_stat_group_year_built_2000_to_2009`, deprecated: false },
    { key: `show_stat_group_year_built_2010_or_later`, deprecated: false },
    { key: `show_stat_group_rent_or_own_rent`, deprecated: false },
    { key: `show_stat_group_transportation_means_car`, deprecated: false },
    { key: `show_stat_group_transportation_means_bike`, deprecated: false },
    { key: `show_stat_group_transportation_means_walk`, deprecated: false },
    { key: `show_stat_group_transportation_means_transit`, deprecated: false },
    { key: `show_stat_group_transportation_means_worked_at_home`, deprecated: false },
    { key: `show_stat_group_transportation_commute_time_under_15`, deprecated: false },
    { key: `show_stat_group_transportation_commute_time_15_to_29`, deprecated: false },
    { key: `show_stat_group_transportation_commute_time_30_to_59`, deprecated: false },
    { key: `show_stat_group_transportation_commute_time_over_60`, deprecated: false },
    { key: `show_stat_group_vehicle_ownership_none`, deprecated: false },
    { key: `show_stat_group_vehicle_ownership_at_least_1`, deprecated: false },
    { key: `show_stat_group_vehicle_ownership_at_least_2`, deprecated: false },
    { key: `show_stat_group_traffic_fatalities_last_decade_per_capita`, deprecated: false },
    { key: `show_stat_group_traffic_fatalities_ped_last_decade_per_capita`, deprecated: false },
    { key: `show_stat_group_traffic_fatalities_last_decade`, deprecated: false },
    { key: `show_stat_group_traffic_fatalities_ped_last_decade`, deprecated: false },
    { key: `show_stat_group_GHLTH_cdc_2`, deprecated: false },
    { key: `show_stat_group_PHLTH_cdc_2`, deprecated: false },
    { key: `show_stat_group_ARTHRITIS_cdc_2`, deprecated: false },
    { key: `show_stat_group_CASTHMA_cdc_2`, deprecated: false },
    { key: `show_stat_group_BPHIGH_cdc_2`, deprecated: false },
    { key: `show_stat_group_CANCER_cdc_2`, deprecated: false },
    { key: `show_stat_group_KIDNEY_cdc_2`, deprecated: false },
    { key: `show_stat_group_COPD_cdc_2`, deprecated: false },
    { key: `show_stat_group_CHD_cdc_2`, deprecated: false },
    { key: `show_stat_group_DIABETES_cdc_2`, deprecated: false },
    { key: `show_stat_group_OBESITY_cdc_2`, deprecated: false },
    { key: `show_stat_group_STROKE_cdc_2`, deprecated: false },
    { key: `show_stat_group_DISABILITY_cdc_2`, deprecated: false },
    { key: `show_stat_group_HEARING_cdc_2`, deprecated: false },
    { key: `show_stat_group_VISION_cdc_2`, deprecated: false },
    { key: `show_stat_group_COGNITION_cdc_2`, deprecated: false },
    { key: `show_stat_group_MOBILITY_cdc_2`, deprecated: false },
    { key: `show_stat_group_SELFCARE_cdc_2`, deprecated: false },
    { key: `show_stat_group_INDEPLIVE_cdc_2`, deprecated: false },
    { key: `show_stat_group_BINGE_cdc_2`, deprecated: false },
    { key: `show_stat_group_CSMOKING_cdc_2`, deprecated: false },
    { key: `show_stat_group_LPA_cdc_2`, deprecated: false },
    { key: `show_stat_group_SLEEP_cdc_2`, deprecated: false },
    { key: `show_stat_group_CHECKUP_cdc_2`, deprecated: false },
    { key: `show_stat_group_DENTAL_cdc_2`, deprecated: false },
    { key: `show_stat_group_CHOLSCREEN_cdc_2`, deprecated: false },
    { key: `show_stat_group_heating_utility_gas`, deprecated: false },
    { key: `show_stat_group_heating_electricity`, deprecated: false },
    { key: `show_stat_group_heating_bottled_tank_lp_gas`, deprecated: false },
    { key: `show_stat_group_heating_feul_oil_kerosene`, deprecated: false },
    { key: `show_stat_group_heating_other`, deprecated: false },
    { key: `show_stat_group_heating_no`, deprecated: false },
    { key: `show_stat_group_industry_agriculture,_forestry,_fishing_and_hunting`, deprecated: false },
    { key: `show_stat_group_industry_mining,_quarrying,_and_oil_and_gas_extraction`, deprecated: false },
    { key: `show_stat_group_industry_accommodation_and_food_services`, deprecated: false },
    { key: `show_stat_group_industry_arts,_entertainment,_and_recreation`, deprecated: false },
    { key: `show_stat_group_industry_construction`, deprecated: false },
    { key: `show_stat_group_industry_educational_services`, deprecated: false },
    { key: `show_stat_group_industry_health_care_and_social_assistance`, deprecated: false },
    { key: `show_stat_group_industry_finance_and_insurance`, deprecated: false },
    { key: `show_stat_group_industry_real_estate_and_rental_and_leasing`, deprecated: false },
    { key: `show_stat_group_industry_information`, deprecated: false },
    { key: `show_stat_group_industry_manufacturing`, deprecated: false },
    { key: `show_stat_group_industry_other_services,_except_public_administration`, deprecated: false },
    { key: `show_stat_group_industry_administrative_and_support_and_waste_management_services`, deprecated: false },
    { key: `show_stat_group_industry_management_of_companies_and_enterprises`, deprecated: false },
    { key: `show_stat_group_industry_professional,_scientific,_and_technical_services`, deprecated: false },
    { key: `show_stat_group_industry_public_administration`, deprecated: false },
    { key: `show_stat_group_industry_retail_trade`, deprecated: false },
    { key: `show_stat_group_industry_transportation_and_warehousing`, deprecated: false },
    { key: `show_stat_group_industry_utilities`, deprecated: false },
    { key: `show_stat_group_industry_wholesale_trade`, deprecated: false },
    { key: `show_stat_group_occupation_architecture_and_engineering_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_computer_and_mathematical_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_life,_physical,_and_social_science_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_arts,_design,_entertainment,_sports,_and_media_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_community_and_social_service_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_educational_instruction,_and_library_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_legal_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_health_technologists_and_technicians`, deprecated: false },
    { key: `show_stat_group_occupation_business_and_financial_operations_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_management_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_construction_and_extraction_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_farming,_fishing,_and_forestry_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_installation,_maintenance,_and_repair_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_material_moving_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_production_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_transportation_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_office_and_administrative_support_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_sales_and_related_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_building_and_grounds_cleaning_and_maintenance_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_food_preparation_and_serving_related_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_healthcare_support_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_personal_care_and_service_occupations`, deprecated: false },
    { key: `show_stat_group_occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors`, deprecated: false },
    { key: `show_stat_group_occupation_law_enforcement_workers_including_supervisors`, deprecated: false },
    { key: `show_stat_group_sors_unpartnered_householder`, deprecated: false },
    { key: `show_stat_group_sors_cohabiting_partnered_gay`, deprecated: false },
    { key: `show_stat_group_sors_cohabiting_partnered_straight`, deprecated: false },
    { key: `show_stat_group_sors_child`, deprecated: false },
    { key: `show_stat_group_sors_other`, deprecated: false },
    { key: `show_stat_group_marriage_never_married`, deprecated: false },
    { key: `show_stat_group_marriage_married_not_divorced`, deprecated: false },
    { key: `show_stat_group_marriage_divorced`, deprecated: false },
    { key: `show_stat_group_2020 Presidential Election-margin`, deprecated: false },
    { key: `show_stat_group_2016 Presidential Election-margin`, deprecated: false },
    { key: `show_stat_group_2016-2020 Swing-margin`, deprecated: false },
    { key: `show_stat_group_park_percent_1km_v2`, deprecated: false },
    { key: `show_stat_group_within_Hospital_10`, deprecated: false },
    { key: `show_stat_group_mean_dist_Hospital_updated`, deprecated: false },
    { key: `show_stat_group_within_Public School_2`, deprecated: false },
    { key: `show_stat_group_mean_dist_Public School_updated`, deprecated: false },
    { key: `show_stat_group_within_Airport_30`, deprecated: false },
    { key: `show_stat_group_mean_dist_Airport_updated`, deprecated: false },
    { key: `show_stat_group_within_Active Superfund Site_10`, deprecated: false },
    { key: `show_stat_group_mean_dist_Active Superfund Site_updated`, deprecated: false },
    { key: `show_stat_group_lapophalfshare_usda_fra_1`, deprecated: false },
    { key: `show_stat_group_lapop1share_usda_fra_1`, deprecated: false },
    { key: `show_stat_group_lapop10share_usda_fra_1`, deprecated: false },
    { key: `show_stat_group_lapop20share_usda_fra_1`, deprecated: false },
    { key: `show_stat_group_mean_high_temp_4`, deprecated: false },
    { key: `show_stat_group_mean_high_heat_index_4`, deprecated: false },
    { key: `show_stat_group_mean_high_dewpoint_4`, deprecated: false },
    { key: `show_stat_group_days_above_90_4`, deprecated: false },
    { key: `show_stat_group_days_between_40_and_90_4`, deprecated: false },
    { key: `show_stat_group_days_below_40_4`, deprecated: false },
    { key: `show_stat_group_days_dewpoint_70_inf_4`, deprecated: false },
    { key: `show_stat_group_days_dewpoint_50_70_4`, deprecated: false },
    { key: `show_stat_group_days_dewpoint_-inf_50_4`, deprecated: false },
    { key: `show_stat_group_hours_sunny_4`, deprecated: false },
    { key: `show_stat_group_rainfall_4`, deprecated: false },
    { key: `show_stat_group_snowfall_4`, deprecated: false },
    { key: `show_stat_group_wind_speed_over_10mph_4`, deprecated: false },
    { key: `show_stat_group_mean_high_temp_summer_4`, deprecated: false },
    { key: `show_stat_group_mean_high_temp_winter_4`, deprecated: false },
    { key: `show_stat_group_mean_high_temp_fall_4`, deprecated: false },
    { key: `show_stat_group_mean_high_temp_spring_4`, deprecated: false },
    { key: `show_stat_group_internet_no_access`, deprecated: false },
    { key: `show_stat_group_insurance_coverage_none`, deprecated: false },
    { key: `show_stat_group_insurance_coverage_govt`, deprecated: false },
    { key: `show_stat_group_insurance_coverage_private`, deprecated: false },
    { key: `show_stat_group_ad_0.25`, deprecated: false },
    { key: `show_stat_group_ad_0.5`, deprecated: false },
    { key: `show_stat_group_ad_2`, deprecated: false },
    { key: `show_stat_group_ad_4`, deprecated: false },
    { key: `show_stat_group_gpw_pw_density_2`, deprecated: true },
    { key: `show_stat_group_gpw_pw_density_4`, deprecated: true },
    { key: `show_stat_year_2020`, deprecated: false },
    { key: `show_stat_year_2010`, deprecated: false },
    { key: `show_stat_year_2000`, deprecated: false },
    { key: `show_historical_cds`, deprecated: false },
    { key: `simple_ordinals`, deprecated: false },
    { key: `use_imperial`, deprecated: false },
    { key: `show_stat_source_Population_US Census`, deprecated: false },
    { key: `show_stat_source_Population_GHSL`, deprecated: false },
] satisfies ({ key: BooleanSettingKey, deprecated: false } | { key: string, deprecated: true })[]

type NotIncludedInSettingsVector = (
    RelationshipKey
    | StatCategorySavedIndeterminateKey
    | StatCategoryExpandedKey
    | 'histogram_type' | 'histogram_relative'
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
    const booleans = settingsVector.map((setting) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- No deprecations yet
        if (setting.deprecated) {
            return false
        }
        return settings[setting.key]
    })
    return base58.binary_to_base58(compressBooleans(booleans))
}

export function fromVector(vector: string, settings: Settings): Record<VectorSettingKey, boolean> {
    const array = decompressBooleans(base58.base58_to_binary(vector))
    const result = settingsVector.flatMap((setting, i) => {
        let value: boolean
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- No deprecations yet
        if (setting.deprecated) {
            return []
        }
        else if (i < array.length) {
            value = array[i]
        }
        else {
            value = settings.get(setting.key)
        }
        return [[setting.key, value]] satisfies [VectorSettingKey, boolean][]
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
