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
    constructor(readonly props: { key: K, coder: SettingCoder<unknown> }) {} // How many bits is our data going to consume

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
    encode(value?: T): boolean[]
    decode(bits: boolean[]): T | typeof underflow
}

const BooleanSettingCoder: SettingCoder<boolean> = {
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
    constructor(readonly bits: number, readonly array: Value[]) {}

    encode(value: Value = this.array[0]): boolean[] {
        const number = this.array.indexOf(value)
        return Array.from({ length: this.bits }).map((_, i) => ((number >> (this.bits - (i + 1))) & 1) === 1 ? true : false)
    }

    decode(bits: boolean[]): Value | typeof underflow {
        if (bits.length === 0) {
            return underflow
        }
        if (bits.length < this.bits) {
            throw new Error('Something bad has happened with settings decoding')
        }
        const number = bits.reduce<number>((n, bit, i) => n | ((bit ? 1 : 0) << (this.bits - (i + 1))), 0)
        return this.array[number] ?? underflow
    }
}

const HistogramTypeSettingCoder = new BitmapCoder(2, [
    'Line',
    'Line (cumulative)',
    'Bar',
])

const TemperatureUnitCoder = new BitmapCoder(1, ['fahrenheit', 'celsius'])

/**
 * DO NOT REORDER, ONLY ADD
 *
 * This vector represents setting values encoded as bit vectors in hyperlinks.
 */
const settingsVector = [
    new ActiveSetting({ key: 'show_stat_group_population', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_1', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_sd', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_area', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_compactness', coder: BooleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_gpw_population', coder: BooleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_gpw_pw_density_1', coder: BooleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_gpw_aw_density', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_white', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_hispanic', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_black', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_asian', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_native', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_hawaiian_pi', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_other  slash  mixed', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_homogeneity_250', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_segregation_250', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_segregation_250_10', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_citizenship_citizen_by_birth', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_citizenship_citizen_by_naturalization', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_citizenship_not_citizen', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_birthplace_non_us', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_birthplace_us_not_state', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_birthplace_us_state', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_language_english_only', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_language_spanish', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_language_other', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_high_school', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_ugrad', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_grad', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_field_stem', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_field_humanities', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_education_field_business', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_female_hs_gap_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_female_ugrad_gap_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_female_grad_gap_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_generation_silent', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_generation_boomer', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_generation_genx', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_generation_millenial', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_generation_genz', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_generation_genalpha', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_poverty_below_line', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_household_income_under_50k', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_household_income_50k_to_100k', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_household_income_over_100k', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_individual_income_under_50k', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_individual_income_50k_to_100k', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_individual_income_over_100k', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_housing_per_pop', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_vacancy', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_burden_under_20', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_burden_20_to_40', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_burden_over_40', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_1br_under_750', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_1br_750_to_1500', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_1br_over_1500', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_2br_under_750', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_2br_750_to_1500', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_2br_over_1500', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_year_built_1969_or_earlier', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_year_built_1970_to_1979', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_year_built_1980_to_1989', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_year_built_1990_to_1999', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_year_built_2000_to_2009', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_year_built_2010_or_later', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rent_or_own_rent', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_car', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_bike', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_walk', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_transit', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_means_worked_at_home', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_commute_time_under_15', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_commute_time_15_to_29', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_commute_time_30_to_59', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_transportation_commute_time_over_60', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_vehicle_ownership_none', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_vehicle_ownership_at_least_1', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_vehicle_ownership_at_least_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_traffic_fatalities_last_decade_per_capita', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_traffic_fatalities_ped_last_decade_per_capita', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_traffic_fatalities_last_decade', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_traffic_fatalities_ped_last_decade', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_GHLTH_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_PHLTH_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ARTHRITIS_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_CASTHMA_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_BPHIGH_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_CANCER_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_KIDNEY_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_COPD_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_CHD_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_DIABETES_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_OBESITY_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_STROKE_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_DISABILITY_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_HEARING_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_VISION_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_COGNITION_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_MOBILITY_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_SELFCARE_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_INDEPLIVE_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_BINGE_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_CSMOKING_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_LPA_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_SLEEP_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_CHECKUP_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_DENTAL_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_CHOLSCREEN_cdc_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_heating_utility_gas', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_heating_electricity', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_heating_bottled_tank_lp_gas', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_heating_feul_oil_kerosene', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_heating_other', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_heating_no', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_agriculture,_forestry,_fishing_and_hunting', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_mining,_quarrying,_and_oil_and_gas_extraction', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_accommodation_and_food_services', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_arts,_entertainment,_and_recreation', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_construction', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_educational_services', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_health_care_and_social_assistance', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_finance_and_insurance', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_real_estate_and_rental_and_leasing', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_information', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_manufacturing', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_other_services,_except_public_administration', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_administrative_and_support_and_waste_management_services', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_management_of_companies_and_enterprises', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_professional,_scientific,_and_technical_services', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_public_administration', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_retail_trade', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_transportation_and_warehousing', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_utilities', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_industry_wholesale_trade', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_architecture_and_engineering_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_computer_and_mathematical_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_life,_physical,_and_social_science_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_arts,_design,_entertainment,_sports,_and_media_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_community_and_social_service_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_educational_instruction,_and_library_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_legal_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_health_technologists_and_technicians', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_business_and_financial_operations_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_management_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_construction_and_extraction_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_farming,_fishing,_and_forestry_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_installation,_maintenance,_and_repair_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_material_moving_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_production_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_transportation_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_office_and_administrative_support_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_sales_and_related_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_building_and_grounds_cleaning_and_maintenance_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_food_preparation_and_serving_related_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_healthcare_support_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_personal_care_and_service_occupations', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_occupation_law_enforcement_workers_including_supervisors', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_sors_unpartnered_householder', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_sors_cohabiting_partnered_gay', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_sors_cohabiting_partnered_straight', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_sors_child', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_sors_other', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_marriage_never_married', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_marriage_married_not_divorced', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_marriage_divorced', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_2020 Presidential Election-margin', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_2016 Presidential Election-margin', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_2016-2020 Swing-margin', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_park_percent_1km_v2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_within_Hospital_10', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_dist_Hospital_updated', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_within_Public School_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_dist_Public School_updated', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_within_Airport_30', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_dist_Airport_updated', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_within_Active Superfund Site_10', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_dist_Active Superfund Site_updated', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_lapophalfshare_usda_fra_1', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_lapop1share_usda_fra_1', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_lapop10share_usda_fra_1', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_lapop20share_usda_fra_1', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_heat_index_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_dewpoint_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_days_above_90_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_days_between_40_and_90_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_days_below_40_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_days_dewpoint_70_inf_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_days_dewpoint_50_70_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_days_dewpoint_-inf_50_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_hours_sunny_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_rainfall_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_snowfall_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_wind_speed_over_10mph_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_summer_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_winter_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_fall_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_mean_high_temp_spring_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_internet_no_access', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_insurance_coverage_none', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_insurance_coverage_govt', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_insurance_coverage_private', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_0.25', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_0.5', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_group_ad_4', coder: BooleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_gpw_pw_density_2', coder: BooleanSettingCoder }),
    new DeprecatedSetting({ key: 'show_stat_group_gpw_pw_density_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_year_2020', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_year_2010', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_year_2000', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_historical_cds', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'simple_ordinals', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'use_imperial', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_source_Population_US Census', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'show_stat_source_Population_GHSL', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_0.25', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_0.25_2000', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_0.25_2010', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_0.5', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_0.5_2000', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_0.5_2010', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_1', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_1_2000', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_1_2010', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_2_2000', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_2_2010', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_4_2000', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__ad_4_2010', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__gpw_pw_density_1', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__gpw_pw_density_2', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'expanded__gpw_pw_density_4', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'histogram_relative', coder: BooleanSettingCoder }),
    new ActiveSetting({ key: 'histogram_type', coder: HistogramTypeSettingCoder }),
    new ActiveSetting({ key: 'temperature_unit', coder: TemperatureUnitCoder }),
] satisfies (ActiveSetting<keyof SettingsDictionary> | DeprecatedSetting<string>)[]

type NotIncludedInSettingsVector = (
    RelationshipKey
    | StatCategorySavedIndeterminateKey
    | StatCategoryExpandedKey
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
        return coder.encode(settings[coder.key] as never)
    })
    return base58.binary_to_base58(compressBooleans(booleans))
}

export function fromVector(vector: string, settings: Settings): { [K in VectorSettingKey]: SettingsDictionary[K] } {
    const array = decompressBooleans(base58.base58_to_binary(vector))
    const result = {} as { [K in VectorSettingKey]: SettingsDictionary[K] }
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
