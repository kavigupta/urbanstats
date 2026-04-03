export default {
    "displayed_metadata": [
        {
            "index": 0,
            "name": "FIPS",
            "setting_key": "show_metadata_fips",
            "show_in_metadata_table": true,
            "category": "geoid",
            "data_credit_explanation_page": "geoid"
        },
        {
            "index": 1,
            "name": "StatCan GeoCode",
            "setting_key": "show_metadata_statcan_geocode",
            "show_in_metadata_table": true,
            "category": "geoid",
            "data_credit_explanation_page": "geoid"
        },
        {
            "index": 4,
            "name": "ISO Code",
            "setting_key": "show_metadata_iso_code",
            "show_in_metadata_table": true,
            "category": "geoid",
            "data_credit_explanation_page": "geoid"
        }
    ],
    "external_link_metadata": [
        {
            "index": 2,
            "site": "Wikidata",
            "link_prefix": "https://www.wikidata.org/wiki/",
            "normalizer": null,
            "show_in_metadata_table": false
        },
        {
            "index": 3,
            "site": "Wikipedia",
            "link_prefix": "https://en.wikipedia.org/wiki/",
            "normalizer": "wikipedia",
            "show_in_metadata_table": false
        }
    ]
} as const