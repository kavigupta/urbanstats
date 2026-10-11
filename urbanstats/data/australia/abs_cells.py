"""Manual mapping from ABS GCP cells to the statistics we compute.

Each entry is {table: {output_column: [short_header codes]}}. The codes are summed.
Short-header codes are not unique across tables (Tot_P appears in many), so the
table is part of the key.

G02's medians are deliberately absent: a median cannot be aggregated, and SA1 is
never displayed, so every geography urbanstats shows needs one recomputed from a
distribution via approximate_quantile. Reconstructing SA1 median rent from the G40
brackets below matches ABS's published figure within $25/week for 88% of SA1s.

Prefer the coarsest cells that still resolve a category: ABS perturbation zeroes
small counts, so a category built from many tiny cells loses population. Parts will
not sum exactly to their published total. Do not close that gap by deriving one
category as the residual of the total, which dumps all the error into that column.
"""

# Census night was 2021-08-10; birth year is taken as 2021 - age.
#
# ABS perturbs each cell independently and small counts get zeroed, so summing
# many tiny cells loses population: building these from the 80 single-year
# columns lost 1.86% of Australia, versus 0.41% from the 5-year groups below.
# Every generation boundary but 76 falls on a 5-year group edge.
G04 = {
    "generation_genalpha": ["Age_yr_0_4_P", "Age_yr_5_9_P"],
    "generation_genz": ["Age_yr_10_14_P", "Age_yr_15_19_P", "Age_yr_20_24_P"],
    "generation_millenial": ["Age_yr_25_29_P", "Age_yr_30_34_P", "Age_yr_35_39_P"],
    "generation_genx": ["Age_yr_40_44_P", "Age_yr_45_49_P", "Age_yr_50_54_P"],
    "generation_boomer": [
        "Age_yr_55_59_P", "Age_yr_60_64_P", "Age_yr_65_69_P", "Age_yr_70_74_P",
        "Age_yr_75_P",
    ],
    "generation_silent": [
        "Age_yr_76_P", "Age_yr_77_P", "Age_yr_78_P", "Age_yr_79_P",
        "Age_yr_80_84_P", "Age_yr_85_89_P", "Age_yr_90_94_P", "Age_yr_95_99_P",
        "Age_yr_100_yr_over_P",
    ],
    "population": ["Tot_P"],
}

COLLAPSE = {
    "G04": G04,
    "G01": {
        "citizen": ["Australian_citizen_P"],
    },
    "G05": {
        "marital_married": ["P_Tot_Married"],
        "marital_separated": ["P_Tot_Separated"],
        "marital_divorced": ["P_Tot_Divorced"],
        "marital_widowed": ["P_Tot_Widowed"],
        "marital_never_married": ["P_Tot_Never_married"],
        "marital_total": ["P_Tot_Tot"],
    },
    "G13": {
        # SEO = speaks English only; UOLSE = uses other language, speaks English.
        "language_english_only": ["P_Tot_SEO"],
        "language_other": ["P_Tot_UOLSE_Tot"],
        "language_not_stated": ["P_Tot_NS"],
        "language_total": ["P_Tot_Tot"],
    },
    "G14": {
        "religion_christian": ["Christianity_Tot_P"],
        "religion_buddhism": ["Buddhism_P"],
        "religion_hinduism": ["Hinduism_P"],
        "religion_islam": ["Islam_P"],
        "religion_judaism": ["Judaism_P"],
        "religion_other": ["Other_Religions_Tot_P"],
        "religion_none": ["SB_OSB_NRA_NR_P"],
        "religion_not_stated": ["Religious_affiliation_ns_P"],
        "religion_total": ["Tot_P"],
    },
    "G16": {
        "school_year12": ["P_Y12e_Tot"],
        "school_year11": ["P_Y11e_Tot"],
        "school_year10": ["P_Y10e_Tot"],
        "school_year9_or_below": ["P_Y9e_Tot", "P_Y8b_Tot", "P_DNGTS_Tot"],
        "school_not_stated": ["P_Hghst_yr_schl_ns_Tot"],
        "school_total": ["P_Tot_Tot"],
    },
    "G49": {
        "qual_postgrad": ["P_PGrad_Deg_Total", "P_GradDip_and_GradCert_Total"],
        "qual_bachelor": ["P_BachDeg_Total"],
        "qual_diploma": ["P_AdvDip_and_Dip_Total"],
        "qual_certificate": ["P_Cert_Lev_Tot_Total"],
        "qual_none_or_not_stated": ["P_Lev_Edu_IDes_Total", "P_Lev_Edu_NS_Total"],
        "qual_total": ["P_Tot_Total"],
    },
    "G17": {
        # Weekly AUD. Brackets kept fine enough to re-cut later.
        "pinc_neg_nil": ["P_Neg_Nil_income_Tot"],
        "pinc_1_499": ["P_1_149_Tot", "P_150_299_Tot", "P_300_399_Tot", "P_400_499_Tot"],
        "pinc_500_999": ["P_500_649_Tot", "P_650_799_Tot", "P_800_999_Tot"],
        "pinc_1000_1749": ["P_1000_1249_Tot", "P_1250_1499_Tot", "P_1500_1749_Tot"],
        "pinc_1750_2999": ["P_1750_1999_Tot", "P_2000_2999_Tot"],
        "pinc_3000_plus": ["P_3000_3499_Tot", "P_3500_more_Tot"],
        "pinc_not_stated": ["P_PI_NS_ns_Tot"],
        "pinc_total": ["P_Tot_Tot"],
    },
    "G33": {
        "hinc_neg_nil": ["Negative_Nil_income_Tot"],
        "hinc_1_649": ["HI_1_149_Tot", "HI_150_299_Tot", "HI_300_399_Tot", "HI_400_499_Tot", "HI_500_649_Tot"],
        "hinc_650_1249": ["HI_650_799_Tot", "HI_800_999_Tot", "HI_1000_1249_Tot"],
        "hinc_1250_1999": ["HI_1250_1499_Tot", "HI_1500_1749_Tot", "HI_1750_1999_Tot"],
        "hinc_2000_2999": ["HI_2000_2499_Tot", "HI_2500_2999_Tot"],
        "hinc_3000_3999": ["HI_3000_3499_Tot", "HI_3500_3999_Tot"],
        "hinc_4000_plus": ["HI_4000_more_Tot"],
        "hinc_not_stated": ["Partial_income_stated_Tot", "All_incomes_not_stated_Tot"],
        "hinc_total": ["Tot_Tot"],
    },
    "G40": {
        # Weekly AUD. Kept at full ABS bracket resolution: these exist to feed
        # approximate_quantile, which needs the bins.
        "rent_1_74": ["R_1_74_Tot"],
        "rent_75_99": ["R_75_99_Tot"],
        "rent_100_149": ["R_100_149_Tot"],
        "rent_150_199": ["R_150_199_Tot"],
        "rent_200_224": ["R_200_224_Tot"],
        "rent_225_274": ["R_225_274_Tot"],
        "rent_275_349": ["R_275_349_Tot"],
        "rent_350_449": ["R_350_449_Tot"],
        "rent_450_549": ["R_450_549_Tot"],
        "rent_550_649": ["R_550_649_Tot"],
        "rent_650_749": ["R_650_749_Tot"],
        "rent_750_849": ["R_750_849_Tot"],
        "rent_850_949": ["R_850_949_Tot"],
        "rent_950_plus": ["R_950_over_Tot"],
        "rent_not_stated": ["Rent_ns_Tot"],
        "rent_total": ["Tot_Tot"],
    },
    "G38": {
        # Monthly AUD, unlike rent which ABS publishes weekly.
        "mortgage_0_299": ["M_0_299_Tot"],
        "mortgage_300_449": ["M_300_449_Tot"],
        "mortgage_450_599": ["M_450_599_Tot"],
        "mortgage_600_799": ["M_600_799_Tot"],
        "mortgage_800_999": ["M_800_999_Tot"],
        "mortgage_1000_1399": ["M_1000_1399_Tot"],
        "mortgage_1400_1799": ["M_1400_1799_Tot"],
        "mortgage_1800_2399": ["M_1800_2399_Tot"],
        "mortgage_2400_2999": ["M_2400_2999_Tot"],
        "mortgage_3000_3999": ["M_3000_3999_Tot"],
        "mortgage_4000_plus": ["M_4000_over_Tot"],
        "mortgage_not_stated": ["Mort_Rpmnt_ns_Total"],
        "mortgage_total": ["Tot_Tot"],
    },
    "G34": {
        "vehicles_0": ["Num_MVs_per_dweling_0_MVs"],
        "vehicles_1": ["Num_MVs_per_dweling_1_MVs"],
        "vehicles_2": ["Num_MVs_per_dweling_2_MVs"],
        "vehicles_3plus": ["Num_MVs_per_dweling_3_MVs", "Num_MVs_per_dweling_4mo_MVs"],
        "vehicles_not_stated": ["Num_MVs_NS"],
        "vehicles_total": ["Num_MVs_per_dweling_Tot"],
    },
    "G36": {
        "dwelling_occupied": ["OPDs_Tot_OPDs_Dwellings"],
        "dwelling_unoccupied": ["Unoccupied_PDs_Dwgs"],
        "dwelling_total": ["Total_PDs_Dwellings"],
        "dwelling_separate_house": ["OPDs_Separate_house_Dwellings"],
        "dwelling_semi_detached": ["OPDs_SD_r_t_h_th_Tot_Dwgs"],
        "dwelling_flat": ["OPDs_Flt_apart_Tot_Dwgs"],
        "dwelling_other_or_not_stated": ["OPDs_Other_dwelling_Tot_Dwgs", "OPDs_Dwlling_structur_NS_Dwgs"],
    },
    "G37": {
        "tenure_owned_outright": ["O_OR_Total"],
        "tenure_mortgage": ["O_MTG_Total"],
        "tenure_rented": ["R_Tot_Total"],
        "tenure_other_or_not_stated": ["Oth_ten_type_Total", "Ten_type_NS_Total"],
        "tenure_total": ["Total_Total"],
    },
    "G54": {
        "industry_agriculture": ["P_Ag_For_Fshg_Tot"],
        "industry_mining": ["P_Mining_Tot"],
        "industry_manufacturing": ["P_Manufact_Tot"],
        "industry_utilities": ["P_El_Gas_Wt_Waste_Tot"],
        "industry_construction": ["P_Constru_Tot"],
        "industry_wholesale": ["P_WhlesaleTde_Tot"],
        "industry_retail": ["P_RetTde_Tot"],
        "industry_accommodation_food": ["P_Accom_food_Tot"],
        "industry_transport": ["P_Trans_post_wrehsg_Tot"],
        "industry_information": ["P_Info_media_teleco_Tot"],
        "industry_finance": ["P_Fin_Insur_Tot"],
        "industry_real_estate": ["P_RtnHir_REst_Tot"],
        "industry_professional": ["P_Pro_scien_tec_Tot"],
        "industry_admin_support": ["P_Admin_supp_Tot"],
        "industry_public_admin": ["P_Public_admin_sfty_Tot"],
        "industry_education": ["P_Educ_trng_Tot"],
        "industry_health": ["P_HlthCare_SocAs_Tot"],
        "industry_arts": ["P_Art_recn_Tot"],
        "industry_other_services": ["P_Oth_scs_Tot"],
        "industry_not_stated": ["P_ID_NS_Tot"],
        "industry_total": ["P_Tot_Tot"],
    },
    "G60": {
        "occupation_managers": ["P_Tot_Managers"],
        "occupation_professionals": ["P_Tot_Professionals"],
        "occupation_trades": ["P_Tot_TechnicTrades_W"],
        "occupation_community_personal": ["P_Tot_CommunPersnlSvc_W"],
        "occupation_clerical": ["P_Tot_ClericalAdminis_W"],
        "occupation_sales": ["P_Tot_Sales_W"],
        "occupation_machinery": ["P_Tot_Mach_oper_drivers"],
        "occupation_labourers": ["P_Tot_Labourers"],
        "occupation_not_stated": ["P_Tot_Occu_ID_NS"],
        "occupation_total": ["P_Tot_Tot"],
    },
    "G62": {
        "commute_transit": [
            "One_method_Train_P", "One_method_Bus_P", "One_method_Ferry_P",
            "One_met_Tram_or_lt_rail_P", "Two_methods_Train_Tot_P",
            "Two_methods_Bus_Tot_P", "Three_meth_Tot_three_meth_P",
        ],
        "commute_car": [
            "One_method_Car_as_driver_P", "One_method_Car_as_passenger_P",
            "One_method_Truck_P", "One_met_Taxi_or_Rideshare_P",
            "One_method_Motorbike_scootr_P",
        ],
        "commute_bike": ["One_method_Bicycle_P"],
        "commute_walk": ["One_method_Walked_only_P"],
        "commute_wfh": ["Worked_home_P"],
        "commute_other": ["One_method_Other_P", "Two_methds_Othr_two_methds_P"],
        "commute_none_or_not_stated": ["Did_not_go_to_work_P", "Method_travel_to_work_ns_P"],
        "commute_total": ["Tot_P"],
    },
}

