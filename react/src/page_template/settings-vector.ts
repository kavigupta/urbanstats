/**
 * When we save settings, we put them in a bit vector
 */

import * as base58 from 'base58-js'

import { defaultSettingsList, RelationshipKey, Settings, SettingsDictionary, StatCategoryExpandedKey, StatCategorySavedIndeterminateKey, useSettings } from './settings'

const underflow = Symbol()

class ActiveSetting<const K extends keyof SettingsDictionary> {
    constructor(readonly props: { key: K, coder: SettingCoder<SettingsDictionary[K]> }) {}

    readonly deprecated = false

    encode(value: SettingsDictionary[K]): boolean[] {
        return this.props.coder.encode(value)
    }

    decode(bits: boolean[], settings: Settings): SettingsDictionary[K] {
        const result = this.props.coder.decode(bits)
        if (result === underflow) {
            return settings.get(this.props.key)
        }
        return result
    }

    get key(): K { return this.props.key }
}

class DeprecatedSetting<const K extends string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary use of any
    constructor(readonly props: { key: K, coder: SettingCoder<any> }) {}

    encode(): boolean[] {
        return this.props.coder.encode()
    }

    decode(bits: boolean[]): void {
        // Need to use the bits, but don't care about the result
        this.props.coder.decode(bits)
    }

    get key(): K {
        return this.props.key
    }

    readonly deprecated = true
}

interface SettingCoder<T> {
    encode: (value?: T) => boolean[]
    decode: (bits: boolean[]) => T | typeof underflow
}

const booleanSettingCoder: SettingCoder<boolean> = {
    encode(value = false) {
        return [value]
    },
    decode(bits) {
        const result = bits.shift()
        if (result === undefined) {
            return underflow
        }
        return result
    },
}

type Double<T extends readonly unknown[]> = [...T, ...T]
type Min2<T extends readonly unknown[]> = [...T] extends [unknown, infer X, ...infer R] ? T | Min2<[X, ...R]> : never

/**
 * Do not modify `bits` once deployed.
 * Only append to `array` once deployed.
 */
class BitmapCoder<const Value> implements SettingCoder<Value> {
    constructor(bits: 1, array: [Value, Value])
    constructor(bits: 2, array: Min2<Double<[Value, Value]>>)
    constructor(bits: 3, array: Min2<Double<Double<[Value, Value]>>>)
    constructor(bits: 4, array: Min2<Double<Double<Double<[Value, Value]>>>>)
    constructor(readonly numBits: number, readonly array: Value[]) {}

    encode(value: Value = this.array[0]): boolean[] {
        const number = this.array.indexOf(value)
        const result: boolean[] = []
        for (let b = this.numBits - 1; b >= 0; b--) {
            result.push(((number >> b) & 1) === 1 ? true : false)
        }
        return result
    }

    decode(bits: boolean[]): Value | typeof underflow {
        if (bits.length === 0) {
            return underflow
        }
        if (bits.length < this.numBits) {
            throw new Error('Something bad has happened with settings decoding')
        }
        let number = 0
        for (let b = this.numBits - 1; b >= 0; b--) {
            number |= (bits.shift() ? 1 : 0) << b
        }
        return this.array[number] ?? underflow
    }
}

const histogramTypeSettingCoder = new BitmapCoder(2, [
    'Line',
    'Line (cumulative)',
    'Bar',
])

const temperatureUnitCoder = new BitmapCoder(1, ['fahrenheit', 'celsius'])

// Too many bits for expansion
const mobileArticlePointersCoder = new BitmapCoder(2, ['pointer_in_class', 'pointer_overall'])

/**
 * DO NOT REORDER, ONLY ADD
 *
 * This vector represents setting values encoded as bit vectors in hyperlinks.
 */
const settingsVector = [
    new ActiveSetting({ key: 'show_stat_group_population', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_1', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_sd', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_area', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_compactness', coder: booleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_gpw_population', coder: booleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_gpw_pw_density_1', coder: booleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_gpw_aw_density', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_white', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_hispanic', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_black', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_asian', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_native', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_hawaiian_pi', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_other  slash  mixed', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_homogeneity_250', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_segregation_250', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_segregation_250_10', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_citizenship_citizen_by_birth', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_citizenship_citizen_by_naturalization', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_citizenship_not_citizen', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_birthplace_non_us', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_birthplace_us_not_state', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_birthplace_us_state', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_language_english_only', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_language_spanish', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_language_other', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_high_school', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_ugrad', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_grad', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_field_stem', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_field_humanities', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_field_business', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_female_hs_gap_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_female_ugrad_gap_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_female_grad_gap_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_generation_silent', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_generation_boomer', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_generation_genx', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_generation_millenial', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_generation_genz', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_generation_genalpha', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_poverty_below_line', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_household_income_under_50k', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_household_income_50k_to_100k', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_household_income_over_100k', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_individual_income_under_50k', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_individual_income_50k_to_100k', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_individual_income_over_100k', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_housing_per_pop', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_vacancy', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_burden_under_20', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_burden_20_to_40', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_burden_over_40', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_1br_under_750', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_1br_750_to_1500', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_1br_over_1500', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_2br_under_750', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_2br_750_to_1500', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_2br_over_1500', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_year_built_1969_or_earlier', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_year_built_1970_to_1979', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_year_built_1980_to_1989', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_year_built_1990_to_1999', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_year_built_2000_to_2009', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_year_built_2010_or_later', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_or_own_rent', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_car', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_bike', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_walk', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_transit', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_worked_at_home', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_commute_time_under_15', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_commute_time_15_to_29', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_commute_time_30_to_59', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_commute_time_over_60', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_vehicle_ownership_none', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_vehicle_ownership_at_least_1', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_vehicle_ownership_at_least_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_traffic_fatalities_last_decade_per_capita', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_traffic_fatalities_ped_last_decade_per_capita', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_traffic_fatalities_last_decade', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_traffic_fatalities_ped_last_decade', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_GHLTH_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_PHLTH_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ARTHRITIS_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_CASTHMA_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_BPHIGH_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_CANCER_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_KIDNEY_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_COPD_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_CHD_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_DIABETES_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_OBESITY_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_STROKE_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_DISABILITY_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_HEARING_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_VISION_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_COGNITION_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_MOBILITY_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_SELFCARE_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_INDEPLIVE_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_BINGE_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_CSMOKING_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_LPA_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_SLEEP_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_CHECKUP_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_DENTAL_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_CHOLSCREEN_cdc_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_heating_utility_gas', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_heating_electricity', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_heating_bottled_tank_lp_gas', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_heating_feul_oil_kerosene', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_heating_other', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_heating_no', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_agriculture,_forestry,_fishing_and_hunting', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_mining,_quarrying,_and_oil_and_gas_extraction', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_accommodation_and_food_services', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_arts,_entertainment,_and_recreation', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_construction', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_educational_services', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_health_care_and_social_assistance', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_finance_and_insurance', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_real_estate_and_rental_and_leasing', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_information', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_manufacturing', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_other_services,_except_public_administration', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_administrative_and_support_and_waste_management_services', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_management_of_companies_and_enterprises', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_professional,_scientific,_and_technical_services', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_public_administration', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_retail_trade', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_transportation_and_warehousing', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_utilities', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_wholesale_trade', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_architecture_and_engineering_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_computer_and_mathematical_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_life,_physical,_and_social_science_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_arts,_design,_entertainment,_sports,_and_media_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_community_and_social_service_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_educational_instruction,_and_library_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_legal_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_health_technologists_and_technicians', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_business_and_financial_operations_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_management_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_construction_and_extraction_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_farming,_fishing,_and_forestry_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_installation,_maintenance,_and_repair_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_material_moving_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_production_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_transportation_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_office_and_administrative_support_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_sales_and_related_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_building_and_grounds_cleaning_and_maintenance_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_food_preparation_and_serving_related_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_healthcare_support_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_personal_care_and_service_occupations', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_law_enforcement_workers_including_supervisors', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_sors_unpartnered_householder', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_sors_cohabiting_partnered_gay', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_sors_cohabiting_partnered_straight', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_sors_child', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_sors_other', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_marriage_never_married', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_marriage_married_not_divorced', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_marriage_divorced', coder: booleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_2020 Presidential Election-margin', coder: booleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_2016 Presidential Election-margin', coder: booleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_2016-2020 Swing-margin', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_park_percent_1km_v2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_within_Hospital_10', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_dist_Hospital_updated', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_within_Public School_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_dist_Public School_updated', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_within_Airport_30', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_dist_Airport_updated', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_within_Active Superfund Site_10', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_dist_Active Superfund Site_updated', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_lapophalfshare_usda_fra_1', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_lapop1share_usda_fra_1', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_lapop10share_usda_fra_1', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_lapop20share_usda_fra_1', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_heat_index_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_dewpoint_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_days_above_90_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_days_between_40_and_90_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_days_below_40_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_days_dewpoint_70_inf_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_days_dewpoint_50_70_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_days_dewpoint_-inf_50_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_hours_sunny_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rainfall_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_snowfall_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_wind_speed_over_10mph_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_summer_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_winter_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_fall_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_spring_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_internet_no_access', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_insurance_coverage_none', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_insurance_coverage_govt', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_insurance_coverage_private', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_0.25', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_0.5', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_4', coder: booleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_gpw_pw_density_2', coder: booleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_gpw_pw_density_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_year_2020', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_year_2010', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_year_2000', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_historical_cds', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'simple_ordinals', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'use_imperial', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_source_Population_US Census', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_source_Population_GHSL', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_0.25', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_0.25_2000', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_0.25_2010', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_0.5', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_0.5_2000', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_0.5_2010', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_1', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_1_2000', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_1_2010', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_2_2000', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_2_2010', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_4_2000', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_4_2010', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__gpw_pw_density_1', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__gpw_pw_density_2', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__gpw_pw_density_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'histogram_relative', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'histogram_type', coder: histogramTypeSettingCoder }),
    new ActiveSetting({ key: 'temperature_unit', coder: temperatureUnitCoder }),
    new ActiveSetting({ key: 'show_stat_group_gridded_elevation', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_gridded_hilliness', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'mobile_article_pointers', coder: mobileArticlePointersCoder }),
    new ActiveSetting({ key: 'show_stat_source_Population_Canadian Census', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2021_pw_0.25_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2021_pw_0.5_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2021_pw_1_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2021_pw_2_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2021_pw_4_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_lico_at_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_individual_income_under_50cad', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_individual_income_50_to_100cad', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_individual_income_above_100_cad', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_household_income_under_50cad', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_household_income_50_to_100cad', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_household_income_above_100_cad', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_high_school_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_ugrad_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_grad_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_pm_25_2018_2022', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_1.609344', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_8', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_16', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_32', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_64', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_1.609344', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_8', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_16', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_32', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_64', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_1.609344_2010', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_8_2010', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_16_2010', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_32_2010', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_64_2010', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_1.609344_2000', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_8_2000', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_16_2000', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_32_2000', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_64_2000', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2021_pw_1.609344_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2021_pw_8_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2021_pw_16_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2021_pw_32_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2021_pw_64_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__gpw_pw_density_1.609344', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__gpw_pw_density_8', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__gpw_pw_density_16', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__gpw_pw_density_32', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__gpw_pw_density_64', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_us_presidential_election', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_djf', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_mam', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_jja', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_son', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_low_temp', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_low_temp_djf', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_low_temp_mam', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_low_temp_jja', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_low_temp_son', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__mean_high_temp_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__mean_low_temp', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__rainfall_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__snowfall_4', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_median_household_income', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_life_expectancy_2019', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_performance_score_adj_2019', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_commute_time_median', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_person_circles', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_canada_general_election_lib', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_canada_general_election_con', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_canada_general_election_ndp', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_canada_general_election_bq', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_canada_general_election_grn', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_canada_general_election_ppc', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_canada_general_election_coalition_margin', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_field_business_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_field_stem_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_field_humanities_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_housing_per_person', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_lim_at_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_language_french', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_language_other_non_french', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_bike_no_wfh', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_transit_no_wfh', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_walk_no_wfh', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_car_no_wfh', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_religion_jewish', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_religion_buddhist', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_religion_hindu', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_religion_sikh', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_religion_muslim', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_religion_catholic', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_religion_protestant', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_religion_other', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_religion_no_religion', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_burden_over_30', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_legislative_and_senior_management', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_business_finance_and_administration', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_natural_and_applied_sciences', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_health', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_education_law_social_community_government', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_art_culture_recreation_sport', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_sales_and_service', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_trades_transport_equipment', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_natural_resources_agriculture', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_manufacturing_utilities', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_household_size_pw', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2011_pw_0.25_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2011_pw_0.5_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2011_pw_1_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2011_pw_2_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2011_pw_4_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2011_pw_1.609344_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2011_pw_8_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2011_pw_16_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2011_pw_32_canada', coder: booleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__density_2011_pw_64_canada', coder: booleanSettingCoder }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary use of any
] satisfies (ActiveSetting<any> | DeprecatedSetting<string>)[]

type NotIncludedInSettingsVector = (
    RelationshipKey
    | StatCategorySavedIndeterminateKey
    | StatCategoryExpandedKey
    | 'theme' | 'colorblind_mode' | 'clean_background'
    | 'juxtastatCompactEmoji' | 'syauRequireEnter' | 'mapperSettingsColumnProp'
)

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- No deprecations yet
export const activeVectorKeys = settingsVector.flatMap(setting => setting.deprecated ? [] : [setting.key])

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
    return encodeVector(settings)
}

export function getVector(settings: Settings, settingOverrides?: Partial<VectorSettingsDictionary>): string {
    return encodeVector({ ...settings.getMultiple(activeVectorKeys), ...settingOverrides })
}

function encodeVector(settings: VectorSettingsDictionary): string {
    const booleans = settingsVector.flatMap((coder) => {
        if (coder.deprecated) {
            return coder.encode()
        }
        return coder.encode(settings[coder.key] as never)
    })
    return base58.binary_to_base58(compressBooleans(booleans))
}

export type VectorSettingsDictionary = { [K in VectorSettingKey]: SettingsDictionary[K] }

export function fromVector(vector: string, settings: Settings): VectorSettingsDictionary {
    const array = decompressBooleans(base58.base58_to_binary(vector))
    const result = {} as VectorSettingsDictionary
    for (const setting of settingsVector) {
        if (setting.deprecated) {
            setting.decode(array)
        }
        else {
            result[setting.key] = setting.decode(array, settings) as never
        }
    }
    return result
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
