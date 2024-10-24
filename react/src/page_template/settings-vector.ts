/**
 * When we save settings, we put them in a bit vector
 */

import * as base58 from 'base58-js'

import { Settings, SettingsDictionary, useSettings } from './settings'
import { GroupIdentifier } from './statistic-tree'

export type BooleanSettingKey = keyof { [K in keyof SettingsDictionary as SettingsDictionary[K] extends boolean ? K : never]: boolean }

/**
 * DO NOT REORDER, ONLY ADD
 *
 * This vector represents setting values encoded as bit vectors in hyperlinks.
 */
const settingsVector = [
    `show_stat_group_${'population' as GroupIdentifier}`,
    `show_stat_group_${'ad_1' as GroupIdentifier}`,
    `show_stat_group_${'sd' as GroupIdentifier}`,
    `show_stat_group_${'area' as GroupIdentifier}`,
    `show_stat_group_${'compactness' as GroupIdentifier}`,
    `show_stat_group_${'gpw_population' as GroupIdentifier}`,
    `show_stat_group_${'gpw_pw_density_1' as GroupIdentifier}`,
    `show_stat_group_${'gpw_aw_density' as GroupIdentifier}`,
    `show_stat_group_${'white' as GroupIdentifier}`,
    `show_stat_group_${'hispanic' as GroupIdentifier}`,
    `show_stat_group_${'black' as GroupIdentifier}`,
    `show_stat_group_${'asian' as GroupIdentifier}`,
    `show_stat_group_${'native' as GroupIdentifier}`,
    `show_stat_group_${'hawaiian_pi' as GroupIdentifier}`,
    `show_stat_group_${'other  slash  mixed' as GroupIdentifier}`,
    `show_stat_group_${'homogeneity_250' as GroupIdentifier}`,
    `show_stat_group_${'segregation_250' as GroupIdentifier}`,
    `show_stat_group_${'segregation_250_10' as GroupIdentifier}`,
    `show_stat_group_${'citizenship_citizen_by_birth' as GroupIdentifier}`,
    `show_stat_group_${'citizenship_citizen_by_naturalization' as GroupIdentifier}`,
    `show_stat_group_${'citizenship_not_citizen' as GroupIdentifier}`,
    `show_stat_group_${'birthplace_non_us' as GroupIdentifier}`,
    `show_stat_group_${'birthplace_us_not_state' as GroupIdentifier}`,
    `show_stat_group_${'birthplace_us_state' as GroupIdentifier}`,
    `show_stat_group_${'language_english_only' as GroupIdentifier}`,
    `show_stat_group_${'language_spanish' as GroupIdentifier}`,
    `show_stat_group_${'language_other' as GroupIdentifier}`,
    `show_stat_group_${'education_high_school' as GroupIdentifier}`,
    `show_stat_group_${'education_ugrad' as GroupIdentifier}`,
    `show_stat_group_${'education_grad' as GroupIdentifier}`,
    `show_stat_group_${'education_field_stem' as GroupIdentifier}`,
    `show_stat_group_${'education_field_humanities' as GroupIdentifier}`,
    `show_stat_group_${'education_field_business' as GroupIdentifier}`,
    `show_stat_group_${'female_hs_gap_4' as GroupIdentifier}`,
    `show_stat_group_${'female_ugrad_gap_4' as GroupIdentifier}`,
    `show_stat_group_${'female_grad_gap_4' as GroupIdentifier}`,
    `show_stat_group_${'generation_silent' as GroupIdentifier}`,
    `show_stat_group_${'generation_boomer' as GroupIdentifier}`,
    `show_stat_group_${'generation_genx' as GroupIdentifier}`,
    `show_stat_group_${'generation_millenial' as GroupIdentifier}`,
    `show_stat_group_${'generation_genz' as GroupIdentifier}`,
    `show_stat_group_${'generation_genalpha' as GroupIdentifier}`,
    `show_stat_group_${'poverty_below_line' as GroupIdentifier}`,
    `show_stat_group_${'household_income_under_50k' as GroupIdentifier}`,
    `show_stat_group_${'household_income_50k_to_100k' as GroupIdentifier}`,
    `show_stat_group_${'household_income_over_100k' as GroupIdentifier}`,
    `show_stat_group_${'individual_income_under_50k' as GroupIdentifier}`,
    `show_stat_group_${'individual_income_50k_to_100k' as GroupIdentifier}`,
    `show_stat_group_${'individual_income_over_100k' as GroupIdentifier}`,
    `show_stat_group_${'housing_per_pop' as GroupIdentifier}`,
    `show_stat_group_${'vacancy' as GroupIdentifier}`,
    `show_stat_group_${'rent_burden_under_20' as GroupIdentifier}`,
    `show_stat_group_${'rent_burden_20_to_40' as GroupIdentifier}`,
    `show_stat_group_${'rent_burden_over_40' as GroupIdentifier}`,
    `show_stat_group_${'rent_1br_under_750' as GroupIdentifier}`,
    `show_stat_group_${'rent_1br_750_to_1500' as GroupIdentifier}`,
    `show_stat_group_${'rent_1br_over_1500' as GroupIdentifier}`,
    `show_stat_group_${'rent_2br_under_750' as GroupIdentifier}`,
    `show_stat_group_${'rent_2br_750_to_1500' as GroupIdentifier}`,
    `show_stat_group_${'rent_2br_over_1500' as GroupIdentifier}`,
    `show_stat_group_${'year_built_1969_or_earlier' as GroupIdentifier}`,
    `show_stat_group_${'year_built_1970_to_1979' as GroupIdentifier}`,
    `show_stat_group_${'year_built_1980_to_1989' as GroupIdentifier}`,
    `show_stat_group_${'year_built_1990_to_1999' as GroupIdentifier}`,
    `show_stat_group_${'year_built_2000_to_2009' as GroupIdentifier}`,
    `show_stat_group_${'year_built_2010_or_later' as GroupIdentifier}`,
    `show_stat_group_${'rent_or_own_rent' as GroupIdentifier}`,
    `show_stat_group_${'transportation_means_car' as GroupIdentifier}`,
    `show_stat_group_${'transportation_means_bike' as GroupIdentifier}`,
    `show_stat_group_${'transportation_means_walk' as GroupIdentifier}`,
    `show_stat_group_${'transportation_means_transit' as GroupIdentifier}`,
    `show_stat_group_${'transportation_means_worked_at_home' as GroupIdentifier}`,
    `show_stat_group_${'transportation_commute_time_under_15' as GroupIdentifier}`,
    `show_stat_group_${'transportation_commute_time_15_to_29' as GroupIdentifier}`,
    `show_stat_group_${'transportation_commute_time_30_to_59' as GroupIdentifier}`,
    `show_stat_group_${'transportation_commute_time_over_60' as GroupIdentifier}`,
    `show_stat_group_${'vehicle_ownership_none' as GroupIdentifier}`,
    `show_stat_group_${'vehicle_ownership_at_least_1' as GroupIdentifier}`,
    `show_stat_group_${'vehicle_ownership_at_least_2' as GroupIdentifier}`,
    `show_stat_group_${'traffic_fatalities_last_decade_per_capita' as GroupIdentifier}`,
    `show_stat_group_${'traffic_fatalities_ped_last_decade_per_capita' as GroupIdentifier}`,
    `show_stat_group_${'traffic_fatalities_last_decade' as GroupIdentifier}`,
    `show_stat_group_${'traffic_fatalities_ped_last_decade' as GroupIdentifier}`,
    `show_stat_group_${'GHLTH_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'PHLTH_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'ARTHRITIS_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'CASTHMA_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'BPHIGH_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'CANCER_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'KIDNEY_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'COPD_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'CHD_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'DIABETES_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'OBESITY_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'STROKE_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'DISABILITY_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'HEARING_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'VISION_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'COGNITION_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'MOBILITY_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'SELFCARE_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'INDEPLIVE_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'BINGE_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'CSMOKING_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'LPA_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'SLEEP_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'CHECKUP_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'DENTAL_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'CHOLSCREEN_cdc_2' as GroupIdentifier}`,
    `show_stat_group_${'heating_utility_gas' as GroupIdentifier}`,
    `show_stat_group_${'heating_electricity' as GroupIdentifier}`,
    `show_stat_group_${'heating_bottled_tank_lp_gas' as GroupIdentifier}`,
    `show_stat_group_${'heating_feul_oil_kerosene' as GroupIdentifier}`,
    `show_stat_group_${'heating_other' as GroupIdentifier}`,
    `show_stat_group_${'heating_no' as GroupIdentifier}`,
    `show_stat_group_${'industry_agriculture,_forestry,_fishing_and_hunting' as GroupIdentifier}`,
    `show_stat_group_${'industry_mining,_quarrying,_and_oil_and_gas_extraction' as GroupIdentifier}`,
    `show_stat_group_${'industry_accommodation_and_food_services' as GroupIdentifier}`,
    `show_stat_group_${'industry_arts,_entertainment,_and_recreation' as GroupIdentifier}`,
    `show_stat_group_${'industry_construction' as GroupIdentifier}`,
    `show_stat_group_${'industry_educational_services' as GroupIdentifier}`,
    `show_stat_group_${'industry_health_care_and_social_assistance' as GroupIdentifier}`,
    `show_stat_group_${'industry_finance_and_insurance' as GroupIdentifier}`,
    `show_stat_group_${'industry_real_estate_and_rental_and_leasing' as GroupIdentifier}`,
    `show_stat_group_${'industry_information' as GroupIdentifier}`,
    `show_stat_group_${'industry_manufacturing' as GroupIdentifier}`,
    `show_stat_group_${'industry_other_services,_except_public_administration' as GroupIdentifier}`,
    `show_stat_group_${'industry_administrative_and_support_and_waste_management_services' as GroupIdentifier}`,
    `show_stat_group_${'industry_management_of_companies_and_enterprises' as GroupIdentifier}`,
    `show_stat_group_${'industry_professional,_scientific,_and_technical_services' as GroupIdentifier}`,
    `show_stat_group_${'industry_public_administration' as GroupIdentifier}`,
    `show_stat_group_${'industry_retail_trade' as GroupIdentifier}`,
    `show_stat_group_${'industry_transportation_and_warehousing' as GroupIdentifier}`,
    `show_stat_group_${'industry_utilities' as GroupIdentifier}`,
    `show_stat_group_${'industry_wholesale_trade' as GroupIdentifier}`,
    `show_stat_group_${'occupation_architecture_and_engineering_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_computer_and_mathematical_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_life,_physical,_and_social_science_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_arts,_design,_entertainment,_sports,_and_media_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_community_and_social_service_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_educational_instruction,_and_library_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_legal_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_health_technologists_and_technicians' as GroupIdentifier}`,
    `show_stat_group_${'occupation_business_and_financial_operations_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_management_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_construction_and_extraction_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_farming,_fishing,_and_forestry_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_installation,_maintenance,_and_repair_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_material_moving_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_production_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_transportation_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_office_and_administrative_support_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_sales_and_related_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_building_and_grounds_cleaning_and_maintenance_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_food_preparation_and_serving_related_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_healthcare_support_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_personal_care_and_service_occupations' as GroupIdentifier}`,
    `show_stat_group_${'occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors' as GroupIdentifier}`,
    `show_stat_group_${'occupation_law_enforcement_workers_including_supervisors' as GroupIdentifier}`,
    `show_stat_group_${'sors_unpartnered_householder' as GroupIdentifier}`,
    `show_stat_group_${'sors_cohabiting_partnered_gay' as GroupIdentifier}`,
    `show_stat_group_${'sors_cohabiting_partnered_straight' as GroupIdentifier}`,
    `show_stat_group_${'sors_child' as GroupIdentifier}`,
    `show_stat_group_${'sors_other' as GroupIdentifier}`,
    `show_stat_group_${'marriage_never_married' as GroupIdentifier}`,
    `show_stat_group_${'marriage_married_not_divorced' as GroupIdentifier}`,
    `show_stat_group_${'marriage_divorced' as GroupIdentifier}`,
    `show_stat_group_${'2020 Presidential Election-margin' as GroupIdentifier}`,
    `show_stat_group_${'2016 Presidential Election-margin' as GroupIdentifier}`,
    `show_stat_group_${'2016-2020 Swing-margin' as GroupIdentifier}`,
    `show_stat_group_${'park_percent_1km_v2' as GroupIdentifier}`,
    `show_stat_group_${'within_Hospital_10' as GroupIdentifier}`,
    `show_stat_group_${'mean_dist_Hospital_updated' as GroupIdentifier}`,
    `show_stat_group_${'within_Public School_2' as GroupIdentifier}`,
    `show_stat_group_${'mean_dist_Public School_updated' as GroupIdentifier}`,
    `show_stat_group_${'within_Airport_30' as GroupIdentifier}`,
    `show_stat_group_${'mean_dist_Airport_updated' as GroupIdentifier}`,
    `show_stat_group_${'within_Active Superfund Site_10' as GroupIdentifier}`,
    `show_stat_group_${'mean_dist_Active Superfund Site_updated' as GroupIdentifier}`,
    `show_stat_group_${'lapophalfshare_usda_fra_1' as GroupIdentifier}`,
    `show_stat_group_${'lapop1share_usda_fra_1' as GroupIdentifier}`,
    `show_stat_group_${'lapop10share_usda_fra_1' as GroupIdentifier}`,
    `show_stat_group_${'lapop20share_usda_fra_1' as GroupIdentifier}`,
    `show_stat_group_${'mean_high_temp_4' as GroupIdentifier}`,
    `show_stat_group_${'mean_high_heat_index_4' as GroupIdentifier}`,
    `show_stat_group_${'mean_high_dewpoint_4' as GroupIdentifier}`,
    `show_stat_group_${'days_above_90_4' as GroupIdentifier}`,
    `show_stat_group_${'days_between_40_and_90_4' as GroupIdentifier}`,
    `show_stat_group_${'days_below_40_4' as GroupIdentifier}`,
    `show_stat_group_${'days_dewpoint_70_inf_4' as GroupIdentifier}`,
    `show_stat_group_${'days_dewpoint_50_70_4' as GroupIdentifier}`,
    `show_stat_group_${'days_dewpoint_-inf_50_4' as GroupIdentifier}`,
    `show_stat_group_${'hours_sunny_4' as GroupIdentifier}`,
    `show_stat_group_${'rainfall_4' as GroupIdentifier}`,
    `show_stat_group_${'snowfall_4' as GroupIdentifier}`,
    `show_stat_group_${'wind_speed_over_10mph_4' as GroupIdentifier}`,
    `show_stat_group_${'mean_high_temp_summer_4' as GroupIdentifier}`,
    `show_stat_group_${'mean_high_temp_winter_4' as GroupIdentifier}`,
    `show_stat_group_${'mean_high_temp_fall_4' as GroupIdentifier}`,
    `show_stat_group_${'mean_high_temp_spring_4' as GroupIdentifier}`,
    `show_stat_group_${'internet_no_access' as GroupIdentifier}`,
    `show_stat_group_${'insurance_coverage_none' as GroupIdentifier}`,
    `show_stat_group_${'insurance_coverage_govt' as GroupIdentifier}`,
    `show_stat_group_${'insurance_coverage_private' as GroupIdentifier}`,
    `show_stat_group_${'ad_0.25' as GroupIdentifier}`,
    `show_stat_group_${'ad_0.5' as GroupIdentifier}`,
    `show_stat_group_${'ad_2' as GroupIdentifier}`,
    `show_stat_group_${'ad_4' as GroupIdentifier}`,
    `show_stat_group_${'gpw_pw_density_2' as GroupIdentifier}`,
    `show_stat_group_${'gpw_pw_density_4' as GroupIdentifier}`,
    'show_stat_year_2020',
    'show_stat_year_2010',
    'show_stat_year_2000',
    'show_historical_cds',
    'simple_ordinals',
    'use_imperial',
] satisfies BooleanSettingKey[]

export function useVector(): string {
    const settings = useSettings(settingsVector)
    const booleans = settingsVector.map(setting => settings[setting])
    return base58.binary_to_base58(compressBooleans(booleans))
}

export function fromVector(vector: string, settings: Settings): Record<BooleanSettingKey, boolean> {
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
