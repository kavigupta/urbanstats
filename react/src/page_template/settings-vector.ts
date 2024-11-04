/**
 * When we save settings, we put them in a bit vector
 */

import * as base58 from 'base58-js'

import { Settings, SettingsDictionary, useSettings } from './settings'
import { allGroups, allYears } from './statistic-tree'

export type BooleanSettingKey = keyof { [K in keyof SettingsDictionary as SettingsDictionary[K] extends boolean ? K : never]: boolean }

/**
 * DO NOT REORDER, ONLY ADD
 *
 * This vector represents setting values encoded as bit vectors in hyperlinks.
 */
const settingsVector = [
    `show_stat_group_population`,
    `show_stat_group_ad_1`,
    `show_stat_group_sd`,
    `show_stat_group_area`,
    `show_stat_group_compactness`,
    `show_stat_group_gpw_population`,
    `show_stat_group_gpw_pw_density_1`,
    `show_stat_group_gpw_aw_density`,
    `show_stat_group_white`,
    `show_stat_group_hispanic`,
    `show_stat_group_black`,
    `show_stat_group_asian`,
    `show_stat_group_native`,
    `show_stat_group_hawaiian_pi`,
    `show_stat_group_other  slash  mixed`,
    `show_stat_group_homogeneity_250`,
    `show_stat_group_segregation_250`,
    `show_stat_group_segregation_250_10`,
    `show_stat_group_citizenship_citizen_by_birth`,
    `show_stat_group_citizenship_citizen_by_naturalization`,
    `show_stat_group_citizenship_not_citizen`,
    `show_stat_group_birthplace_non_us`,
    `show_stat_group_birthplace_us_not_state`,
    `show_stat_group_birthplace_us_state`,
    `show_stat_group_language_english_only`,
    `show_stat_group_language_spanish`,
    `show_stat_group_language_other`,
    `show_stat_group_education_high_school`,
    `show_stat_group_education_ugrad`,
    `show_stat_group_education_grad`,
    `show_stat_group_education_field_stem`,
    `show_stat_group_education_field_humanities`,
    `show_stat_group_education_field_business`,
    `show_stat_group_female_hs_gap_4`,
    `show_stat_group_female_ugrad_gap_4`,
    `show_stat_group_female_grad_gap_4`,
    `show_stat_group_generation_silent`,
    `show_stat_group_generation_boomer`,
    `show_stat_group_generation_genx`,
    `show_stat_group_generation_millenial`,
    `show_stat_group_generation_genz`,
    `show_stat_group_generation_genalpha`,
    `show_stat_group_poverty_below_line`,
    `show_stat_group_household_income_under_50k`,
    `show_stat_group_household_income_50k_to_100k`,
    `show_stat_group_household_income_over_100k`,
    `show_stat_group_individual_income_under_50k`,
    `show_stat_group_individual_income_50k_to_100k`,
    `show_stat_group_individual_income_over_100k`,
    `show_stat_group_housing_per_pop`,
    `show_stat_group_vacancy`,
    `show_stat_group_rent_burden_under_20`,
    `show_stat_group_rent_burden_20_to_40`,
    `show_stat_group_rent_burden_over_40`,
    `show_stat_group_rent_1br_under_750`,
    `show_stat_group_rent_1br_750_to_1500`,
    `show_stat_group_rent_1br_over_1500`,
    `show_stat_group_rent_2br_under_750`,
    `show_stat_group_rent_2br_750_to_1500`,
    `show_stat_group_rent_2br_over_1500`,
    `show_stat_group_year_built_1969_or_earlier`,
    `show_stat_group_year_built_1970_to_1979`,
    `show_stat_group_year_built_1980_to_1989`,
    `show_stat_group_year_built_1990_to_1999`,
    `show_stat_group_year_built_2000_to_2009`,
    `show_stat_group_year_built_2010_or_later`,
    `show_stat_group_rent_or_own_rent`,
    `show_stat_group_transportation_means_car`,
    `show_stat_group_transportation_means_bike`,
    `show_stat_group_transportation_means_walk`,
    `show_stat_group_transportation_means_transit`,
    `show_stat_group_transportation_means_worked_at_home`,
    `show_stat_group_transportation_commute_time_under_15`,
    `show_stat_group_transportation_commute_time_15_to_29`,
    `show_stat_group_transportation_commute_time_30_to_59`,
    `show_stat_group_transportation_commute_time_over_60`,
    `show_stat_group_vehicle_ownership_none`,
    `show_stat_group_vehicle_ownership_at_least_1`,
    `show_stat_group_vehicle_ownership_at_least_2`,
    `show_stat_group_traffic_fatalities_last_decade_per_capita`,
    `show_stat_group_traffic_fatalities_ped_last_decade_per_capita`,
    `show_stat_group_traffic_fatalities_last_decade`,
    `show_stat_group_traffic_fatalities_ped_last_decade`,
    `show_stat_group_GHLTH_cdc_2`,
    `show_stat_group_PHLTH_cdc_2`,
    `show_stat_group_ARTHRITIS_cdc_2`,
    `show_stat_group_CASTHMA_cdc_2`,
    `show_stat_group_BPHIGH_cdc_2`,
    `show_stat_group_CANCER_cdc_2`,
    `show_stat_group_KIDNEY_cdc_2`,
    `show_stat_group_COPD_cdc_2`,
    `show_stat_group_CHD_cdc_2`,
    `show_stat_group_DIABETES_cdc_2`,
    `show_stat_group_OBESITY_cdc_2`,
    `show_stat_group_STROKE_cdc_2`,
    `show_stat_group_DISABILITY_cdc_2`,
    `show_stat_group_HEARING_cdc_2`,
    `show_stat_group_VISION_cdc_2`,
    `show_stat_group_COGNITION_cdc_2`,
    `show_stat_group_MOBILITY_cdc_2`,
    `show_stat_group_SELFCARE_cdc_2`,
    `show_stat_group_INDEPLIVE_cdc_2`,
    `show_stat_group_BINGE_cdc_2`,
    `show_stat_group_CSMOKING_cdc_2`,
    `show_stat_group_LPA_cdc_2`,
    `show_stat_group_SLEEP_cdc_2`,
    `show_stat_group_CHECKUP_cdc_2`,
    `show_stat_group_DENTAL_cdc_2`,
    `show_stat_group_CHOLSCREEN_cdc_2`,
    `show_stat_group_heating_utility_gas`,
    `show_stat_group_heating_electricity`,
    `show_stat_group_heating_bottled_tank_lp_gas`,
    `show_stat_group_heating_feul_oil_kerosene`,
    `show_stat_group_heating_other`,
    `show_stat_group_heating_no`,
    `show_stat_group_industry_agriculture,_forestry,_fishing_and_hunting`,
    `show_stat_group_industry_mining,_quarrying,_and_oil_and_gas_extraction`,
    `show_stat_group_industry_accommodation_and_food_services`,
    `show_stat_group_industry_arts,_entertainment,_and_recreation`,
    `show_stat_group_industry_construction`,
    `show_stat_group_industry_educational_services`,
    `show_stat_group_industry_health_care_and_social_assistance`,
    `show_stat_group_industry_finance_and_insurance`,
    `show_stat_group_industry_real_estate_and_rental_and_leasing`,
    `show_stat_group_industry_information`,
    `show_stat_group_industry_manufacturing`,
    `show_stat_group_industry_other_services,_except_public_administration`,
    `show_stat_group_industry_administrative_and_support_and_waste_management_services`,
    `show_stat_group_industry_management_of_companies_and_enterprises`,
    `show_stat_group_industry_professional,_scientific,_and_technical_services`,
    `show_stat_group_industry_public_administration`,
    `show_stat_group_industry_retail_trade`,
    `show_stat_group_industry_transportation_and_warehousing`,
    `show_stat_group_industry_utilities`,
    `show_stat_group_industry_wholesale_trade`,
    `show_stat_group_occupation_architecture_and_engineering_occupations`,
    `show_stat_group_occupation_computer_and_mathematical_occupations`,
    `show_stat_group_occupation_life,_physical,_and_social_science_occupations`,
    `show_stat_group_occupation_arts,_design,_entertainment,_sports,_and_media_occupations`,
    `show_stat_group_occupation_community_and_social_service_occupations`,
    `show_stat_group_occupation_educational_instruction,_and_library_occupations`,
    `show_stat_group_occupation_legal_occupations`,
    `show_stat_group_occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations`,
    `show_stat_group_occupation_health_technologists_and_technicians`,
    `show_stat_group_occupation_business_and_financial_operations_occupations`,
    `show_stat_group_occupation_management_occupations`,
    `show_stat_group_occupation_construction_and_extraction_occupations`,
    `show_stat_group_occupation_farming,_fishing,_and_forestry_occupations`,
    `show_stat_group_occupation_installation,_maintenance,_and_repair_occupations`,
    `show_stat_group_occupation_material_moving_occupations`,
    `show_stat_group_occupation_production_occupations`,
    `show_stat_group_occupation_transportation_occupations`,
    `show_stat_group_occupation_office_and_administrative_support_occupations`,
    `show_stat_group_occupation_sales_and_related_occupations`,
    `show_stat_group_occupation_building_and_grounds_cleaning_and_maintenance_occupations`,
    `show_stat_group_occupation_food_preparation_and_serving_related_occupations`,
    `show_stat_group_occupation_healthcare_support_occupations`,
    `show_stat_group_occupation_personal_care_and_service_occupations`,
    `show_stat_group_occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors`,
    `show_stat_group_occupation_law_enforcement_workers_including_supervisors`,
    `show_stat_group_sors_unpartnered_householder`,
    `show_stat_group_sors_cohabiting_partnered_gay`,
    `show_stat_group_sors_cohabiting_partnered_straight`,
    `show_stat_group_sors_child`,
    `show_stat_group_sors_other`,
    `show_stat_group_marriage_never_married`,
    `show_stat_group_marriage_married_not_divorced`,
    `show_stat_group_marriage_divorced`,
    `show_stat_group_2020 Presidential Election-margin`,
    `show_stat_group_2016 Presidential Election-margin`,
    `show_stat_group_2016-2020 Swing-margin`,
    `show_stat_group_park_percent_1km_v2`,
    `show_stat_group_within_Hospital_10`,
    `show_stat_group_mean_dist_Hospital_updated`,
    `show_stat_group_within_Public School_2`,
    `show_stat_group_mean_dist_Public School_updated`,
    `show_stat_group_within_Airport_30`,
    `show_stat_group_mean_dist_Airport_updated`,
    `show_stat_group_within_Active Superfund Site_10`,
    `show_stat_group_mean_dist_Active Superfund Site_updated`,
    `show_stat_group_lapophalfshare_usda_fra_1`,
    `show_stat_group_lapop1share_usda_fra_1`,
    `show_stat_group_lapop10share_usda_fra_1`,
    `show_stat_group_lapop20share_usda_fra_1`,
    `show_stat_group_mean_high_temp_4`,
    `show_stat_group_mean_high_heat_index_4`,
    `show_stat_group_mean_high_dewpoint_4`,
    `show_stat_group_days_above_90_4`,
    `show_stat_group_days_between_40_and_90_4`,
    `show_stat_group_days_below_40_4`,
    `show_stat_group_days_dewpoint_70_inf_4`,
    `show_stat_group_days_dewpoint_50_70_4`,
    `show_stat_group_days_dewpoint_-inf_50_4`,
    `show_stat_group_hours_sunny_4`,
    `show_stat_group_rainfall_4`,
    `show_stat_group_snowfall_4`,
    `show_stat_group_wind_speed_over_10mph_4`,
    `show_stat_group_mean_high_temp_summer_4`,
    `show_stat_group_mean_high_temp_winter_4`,
    `show_stat_group_mean_high_temp_fall_4`,
    `show_stat_group_mean_high_temp_spring_4`,
    `show_stat_group_internet_no_access`,
    `show_stat_group_insurance_coverage_none`,
    `show_stat_group_insurance_coverage_govt`,
    `show_stat_group_insurance_coverage_private`,
    `show_stat_group_ad_0.25`,
    `show_stat_group_ad_0.5`,
    `show_stat_group_ad_2`,
    `show_stat_group_ad_4`,
    `show_stat_group_gpw_pw_density_2`,
    `show_stat_group_gpw_pw_density_4`,
    `show_stat_year_2020`,
    `show_stat_year_2010`,
    `show_stat_year_2000`,
    'show_historical_cds',
    'simple_ordinals',
    'use_imperial',
] satisfies BooleanSettingKey[]

function sanityCheckVector(): void {
    // Should include checks for very potential type parameter in the settings vector
    const missingYears = allYears.filter(year => !settingsVector.includes(`show_stat_year_${year}`))
    if (missingYears.length > 0) {
        throw new Error(`Settings vector is missing years: ${missingYears.join(', ')}`)
    }
    const missingGroups = allGroups.filter(group => !settingsVector.includes(`show_stat_group_${group.id}`))
    if (missingGroups.length > 0) {
        throw new Error(`Settings vector is missing groups: ${missingGroups.map(group => group.id).join(', ')}`)
    }
}

sanityCheckVector()

export type VectorSettingKey = typeof settingsVector[number]

export function useVector(): string {
    const settings = useSettings(settingsVector)
    const booleans = settingsVector.map(setting => settings[setting])
    return base58.binary_to_base58(compressBooleans(booleans))
}

export function fromVector(vector: string, settings: Settings): Record<VectorSettingKey, boolean> {
    const array = decompressBooleans(base58.base58_to_binary(vector))
    return Object.fromEntries(settingsVector.map((setting, i) => {
        const value = i < array.length ? array[i] : settings.get(setting)
        return [setting, value]
    })) as Record<BooleanSettingKey, boolean>
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
